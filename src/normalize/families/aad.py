"""
Azure AD Audit Events Normalizer
Handles AAD Audit Log format (application updates, permission grants, etc.)
"""

import json
from typing import Dict, Optional
from ..utils import (
    parse_timestamp, generate_event_id, safe_get,
    truncate_raw, extract_email_parts
)
from ..pseudo import (
    pseudonymize_email, pseudonymize_ip, pseudonymize_domain,
    get_geo_code, SIM_DOMAIN
)

# Operation name to event type mapping
OPERATION_MAP = {
    "Update application": "idp.app_update",
    "Update application – Certificates and secrets management": "idp.app_secret_update",
    "Add delegated permission grant": "idp.permission_grant",
    "Consent to application": "idp.app_consent",
    "Add application": "idp.app_create",
    "Add service principal": "idp.sp_create",
    "Add member to role": "idp.role_assign",
    "Add user": "idp.user_create",
    "Update user": "idp.user_update",
    "Delete user": "idp.user_delete",
    "Change user password": "idp.password_change",
    "Reset user password": "idp.password_reset",
    "Sign-in activity": "auth.login",
    "Sign-in from unknown source": "auth.login_suspicious",
    "Risky sign-in": "auth.login_risky",
    "Add owner to application": "idp.app_owner_add",
    "Add owner to service principal": "idp.sp_owner_add",
}

# Category to severity base
CATEGORY_SEVERITY = {
    "ApplicationManagement": 5,
    "UserManagement": 4,
    "GroupManagement": 4,
    "RoleManagement": 7,
    "PolicyManagement": 6,
    "DeviceManagement": 4,
}


def detect_family(obj: Dict) -> bool:
    """Check if this is an AAD Audit Event."""
    indicators = [
        obj.get('SourceSystem') == 'Azure AD',
        'OperationName' in obj,
        'AADTenantId' in obj,
        obj.get('Type') in ['AuditLogs', 'Application', 'ServicePrincipal'],
        'InitiatedBy' in obj or 'InitiatingUserOrApp' in obj,
        'ActivityDisplayName' in obj,
    ]
    return sum(indicators) >= 2


def _parse_initiated_by(obj: Dict) -> Optional[Dict]:
    """Parse InitiatedBy field to get user info."""
    initiated_by = obj.get('InitiatedBy')
    if not initiated_by:
        # Try alternative fields
        user_email = obj.get('InitiatingUserOrApp') or obj.get('InitiatingUser')
        if user_email:
            return pseudonymize_email(user_email)
        return None
    
    # Parse JSON if string
    if isinstance(initiated_by, str):
        try:
            initiated_by = json.loads(initiated_by)
        except:
            return pseudonymize_email(initiated_by)
    
    # Extract user from nested structure
    user_info = safe_get(initiated_by, 'user')
    if user_info:
        upn = safe_get(user_info, 'userPrincipalName')
        if upn:
            return pseudonymize_email(upn)
        display = safe_get(user_info, 'displayName')
        if display:
            return pseudonymize_email(f"{display}@temp.local")
    
    # Try app info
    app_info = safe_get(initiated_by, 'app')
    if app_info:
        app_name = safe_get(app_info, 'displayName') or safe_get(app_info, 'appId')
        if app_name:
            return {
                "id": f"app-{app_name[:8]}",
                "email": "",
                "display": f"App: {app_name}"
            }
    
    return None


def _parse_target(obj: Dict) -> Optional[str]:
    """Parse target resource from event."""
    target = obj.get('target') or obj.get('TargetResources')
    if not target:
        return obj.get('targetDisplayName')
    
    # Parse JSON if string
    if isinstance(target, str):
        try:
            target = json.loads(target)
        except:
            return target[:100] if len(target) > 100 else target
    
    # Handle list
    if isinstance(target, list) and target:
        target = target[0]
    
    if isinstance(target, dict):
        return target.get('displayName') or target.get('id')
    
    return str(target)[:100] if target else None


def normalize(obj: Dict) -> Optional[Dict]:
    """Normalize AAD Audit Event to canonical format."""
    try:
        # Extract operation/event type
        operation = obj.get('OperationName') or obj.get('ActivityDisplayName') or ''
        event_type = OPERATION_MAP.get(operation.strip(), f"idp.{operation.lower().replace(' ', '_')[:30]}")
        
        # Clean up event type
        event_type = event_type.replace('–', '_').replace('-', '_')
        
        # Extract timestamp
        ts = parse_timestamp(
            obj.get('TimeGenerated') or 
            obj.get('ActivityDateTime') or
            obj.get('Timestamp')
        )
        if not ts:
            return None
        
        # Extract user info
        user = _parse_initiated_by(obj)
        
        # Determine severity
        category = obj.get('Category', '')
        base_severity = CATEGORY_SEVERITY.get(category, 3)
        
        # Boost severity for sensitive operations
        op_lower = operation.lower()
        if any(x in op_lower for x in ['secret', 'credential', 'password', 'permission', 'consent']):
            base_severity = max(base_severity, 6)
        if any(x in op_lower for x in ['admin', 'role', 'privilege']):
            base_severity = max(base_severity, 7)
        
        # Check result
        result = obj.get('Result', '').lower()
        if result == 'failure' or result == 'failed':
            base_severity = max(base_severity, 5)
        
        # Build tags
        tags = ["simulated", "normalized", "aad", "idp"]
        if category:
            tags.append(f"category:{category.lower()}")
        if 'permission' in op_lower or 'consent' in op_lower:
            tags.append("oauth")
            tags.append("mitre:T1550.001")  # Use Alternate Authentication Material
        if 'application' in op_lower:
            tags.append("app_management")
        
        # Extract target info
        target = _parse_target(obj)
        
        # Build canonical event
        event = {
            "event_id": generate_event_id("aad"),
            "ts": ts,
            "source": "aad",
            "event_type": event_type,
            "severity": base_severity,
            "tags": tags,
            "raw": truncate_raw(obj)
        }
        
        if user:
            event["user"] = user
        
        if target:
            # Add target as artifact
            event["artifact"] = {
                "target": target,
                "type": obj.get('Type') or obj.get('targetType')
            }
        
        # Add permissions info if present
        permissions = obj.get('Permissions')
        if permissions:
            if "artifact" not in event:
                event["artifact"] = {}
            event["artifact"]["permissions"] = permissions
        
        # Extract user agent if available
        user_agent = obj.get('UserAgent')
        if user_agent:
            if "device" not in event:
                event["device"] = {}
            event["device"]["user_agent"] = user_agent[:200]
        
        return event
        
    except Exception as e:
        return None
