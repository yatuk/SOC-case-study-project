# Investigation Queries - Tool Agnostic

This document provides pseudocode and conceptual queries for investigating the phishing → account compromise scenario. These can be adapted to any SIEM/logging platform (Splunk, Elastic, Azure Sentinel, Chronicle, etc.).

---

## Email Investigation

### Find Phishing Emails by Sender Domain

```
source_type = "email_gateway"
| WHERE sender_domain IN known_phishing_domains
| OR spf_result = "FAIL"
| OR dkim_result IN ("FAIL", "NONE")
| STATS count BY sender, recipient, subject, urls
| SORT BY timestamp DESC
```

### Find All Recipients of Specific Phishing Campaign

```
source_type = "email_gateway"
| WHERE sender = "noreply@micros0ft-secure.info"
| OR subject CONTAINS "Urgent: Verify"
| SELECT timestamp, recipient, message_id
| UNIQUE BY recipient
```

---

## Authentication Investigation

### Timeline of All Login Events for User

```
source_type = "identity"
| WHERE user = "sarah.chen@acmecorp.example.com"
| SELECT timestamp, event, src_ip, src_geo, device, mfa_method, result
| SORT BY timestamp ASC
```

### Find All Logins from Suspicious IP

```
source_type = "identity"
| WHERE src_ip = "89.34.126.77"
| SELECT timestamp, user, device, mfa_method, result
| STATS login_attempts BY user, result
```

### Detect Multi-Factor Authentication Anomalies

```
source_type = "identity"
| event = "login.fail"
| STATS failures BY user, src_ip
| JOIN WITH (
    source_type = "identity"
    | event = "login.success"
    | WHERE mfa_method IS NOT NULL
  ) ON user WITHIN 5 minutes
| WHERE failures.count >= 2
```

---

## Mailbox Activity Investigation

### Find All Mailbox Rules for User

```
source_type = "cloud_mailbox"
| WHERE operation IN ("New-InboxRule", "Set-InboxRule")
| AND user = "sarah.chen@acmecorp.example.com"
| SELECT timestamp, rule_name, rule_conditions, rule_actions, src_ip
```

### Identify External Forwarding Rules (All Users)

```
source_type = "cloud_mailbox"
| WHERE operation CONTAINS "InboxRule"
| AND rule_actions CONTAINS "ForwardTo"
| PARSE rule_actions FOR email_addresses
| WHERE email_domain NOT IN corporate_domains
| SELECT user, rule_name, forwarding_address, timestamp, src_ip
```

### Mailbox Search and Access Patterns

```
source_type = "cloud_mailbox"
| WHERE user = "sarah.chen@acmecorp.example.com"
| AND operation IN ("SearchMailbox", "MailItemsAccessed", "MessageBind")
| SELECT timestamp, operation, query, results_count, operation_count, src_ip
| SORT BY timestamp ASC
```

---

## Web Proxy Investigation

### Find All Accesses to Known-Bad Domains

```
source_type = "web_proxy"
| WHERE domain IN malicious_domains_list
| SELECT timestamp, user, url, method, status, src_ip
| STATS BY user, domain
```

### Correlate Email → Click Chain

```
# Step 1: Get phishing email timestamps
email_events = (
  source_type = "email_gateway"
  | WHERE ioc_match IS NOT NULL
  | SELECT timestamp AS email_time, user, urls
)

# Step 2: Find web clicks within 30 minutes
web_events = (
  source_type = "web_proxy"
  | SELECT timestamp AS click_time, user, url
)

# Step 3: Join
email_events
| JOIN web_events ON user
| WHERE click_time >= email_time
| AND click_time <= email_time + 30 minutes
| AND DOMAIN(web_events.url) IN DOMAIN(email_events.urls)
```

---

## Cross-Source Correlation

### Full Activity Timeline for User (All Sources)

```
(
  source_type = "email_gateway" | WHERE recipient = "sarah.chen@acmecorp.example.com"
  | SELECT timestamp, "EMAIL" AS source, subject AS activity
)
UNION ALL
(
  source_type = "identity" | WHERE user = "sarah.chen@acmecorp.example.com"
  | SELECT timestamp, "AUTH" AS source, event + " from " + src_geo AS activity
)
UNION ALL
(
  source_type = "web_proxy" | WHERE user = "sarah.chen"
  | SELECT timestamp, "WEB" AS source, url AS activity
)
UNION ALL
(
  source_type = "cloud_mailbox" | WHERE user = "sarah.chen@acmecorp.example.com"
  | SELECT timestamp, "MAILBOX" AS source, operation AS activity
)
| SORT BY timestamp ASC
```

### Identify Impossible Travel Candidates

```
WITH consecutive_logins AS (
  SELECT
    user,
    timestamp AS login_time_1,
    src_geo AS geo_1,
    src_ip AS ip_1,
    LEAD(timestamp) OVER (PARTITION BY user ORDER BY timestamp) AS login_time_2,
    LEAD(src_geo) OVER (PARTITION BY user ORDER BY timestamp) AS geo_2,
    LEAD(src_ip) OVER (PARTITION BY user ORDER BY timestamp) AS ip_2
  FROM identity_logs
  WHERE event = "login.success"
)
SELECT
  user,
  login_time_1,
  login_time_2,
  geo_1,
  geo_2,
  ip_1,
  ip_2,
  TIMEDIFF(login_time_2, login_time_1) AS time_diff
FROM consecutive_logins
WHERE
  geo_1.country != geo_2.country
  AND TIMEDIFF(login_time_2, login_time_1) < 60 minutes
```

---

## Threat Hunting Queries

### Find Users Accessing Mailbox from Non-Corporate IPs

```
source_type = "cloud_mailbox"
| WHERE src_ip NOT IN corporate_ip_ranges
| AND src_ip NOT IN vpn_egress_ips
| STATS operations BY user, src_ip, src_geo
| WHERE operations > 5
```

### Hunt for Stealthy Data Collection

```
source_type = "cloud_mailbox"
| WHERE operation = "SearchMailbox"
| AND query CONTAINS ("password" OR "confidential" OR "sensitive" OR "invoice" OR "contract")
| SELECT timestamp, user, query, results_count, src_ip, src_geo
```

### Identify Accounts with MFA Bypass Attempts

```
source_type = "identity"
| event = "login.success"
| WHERE mfa_method IS NULL
| AND src_ip NOT IN corporate_ip_ranges
| STATS BY user, src_ip, src_geo
```

---

## IOC Enrichment Queries

### Check if IP Appears in Multiple Events

```
DEFINE suspicious_ip = "89.34.126.77"

(source_type = "identity" | WHERE src_ip = suspicious_ip | SELECT timestamp, user, "auth" AS data_source)
UNION
(source_type = "web_proxy" | WHERE src_ip = suspicious_ip | SELECT timestamp, user, "web" AS data_source)
UNION
(source_type = "cloud_mailbox" | WHERE client_ip = suspicious_ip | SELECT timestamp, user, "mailbox" AS data_source)
| SORT BY timestamp ASC
```

### Pivot on Domain IOC

```
DEFINE malicious_domain = "verify-account.top"

(source_type = "email_gateway" | WHERE urls CONTAINS malicious_domain)
UNION
(source_type = "web_proxy" | WHERE url CONTAINS malicious_domain)
| SELECT timestamp, user, source_type, url OR urls AS indicator
```

---

## Response Verification Queries

### Verify Session Revocation

```
source_type = "identity"
| WHERE event = "session.revoke"
| AND user = "sarah.chen@acmecorp.example.com"
| SELECT timestamp, actor, reason
```

### Confirm Mailbox Rule Deletion

```
source_type = "cloud_mailbox"
| WHERE operation = "Remove-InboxRule"
| AND user = "sarah.chen@acmecorp.example.com"
| SELECT timestamp, rule_name, actor, reason
```

### Check for Continued Suspicious Activity Post-Remediation

```
remediation_time = "2026-01-10T10:05:00Z"

source_type = *
| WHERE user = "sarah.chen@acmecorp.example.com"
| AND timestamp > remediation_time
| AND (
    ioc_match IS NOT NULL
    OR src_ip IN suspicious_ips
    OR event CONTAINS "fail"
  )
```

---

## Notes on Adaptation

These queries are written in a generic pseudocode syntax. To adapt to your specific platform:

- **Splunk**: Replace `|` with `|`, use `stats count by`, `eval`, `join`, `transaction`
- **Elastic/Kibana**: Use Lucene syntax or KQL, aggregations, runtime fields
- **Azure Sentinel (KQL)**: Use `where`, `summarize`, `join`, `extend`, `project`
- **Chronicle (UDM)**: Refer to UDM schema fields, use `GRAPH` for correlations
- **SQL-based SIEMs**: Convert to standard SQL with appropriate JOIN and WHERE clauses

Always test queries in a non-production environment first and adjust time windows and thresholds based on your environment's baseline.
