import { useState } from 'react'
import { Card, Title, Text } from '@tremor/react'
import { ShieldAlert, UserX, Mail, Lock, Zap, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function ActionCenter() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const executeAction = (actionId: string, label: string) => {
    setLoadingAction(actionId)
    // Simulate API call
    setTimeout(() => {
        setLoadingAction(null)
        toast.success(`Aksiyon Başarılı: ${label}`, {
            description: "SOAR playbook tetiklendi ve başarıyla tamamlandı."
        })
    }, 2000)
  }

  const actions = [
    { id: 'block_ip', label: 'IP Adresini Engelle', icon: ShieldAlert, color: 'destructive' },
    { id: 'isolate_host', label: 'Cihazı İzole Et', icon: Lock, color: 'warning' },
    { id: 'disable_user', label: 'Kullanıcıyı Devre Dışı Bırak', icon: UserX, color: 'orange' },
    { id: 'reset_pwd', label: 'Şifre Sıfırla (Email)', icon: Mail, color: 'secondary' },
  ]

  return (
    <Card>
      <Title className="mb-4 flex items-center gap-2">
        <Zap className="h-5 w-5 text-yellow-500" />
        Aksiyon Merkezi (SOAR)
      </Title>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
            <Button
                key={action.id}
                variant={action.color === 'destructive' ? 'destructive' : 'secondary'}
                className="h-24 flex flex-col gap-2 items-center justify-center p-4 text-center hover:scale-[1.02] transition-transform"
                onClick={() => executeAction(action.id, action.label)}
                disabled={!!loadingAction}
            >
                {loadingAction === action.id ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                    <action.icon className="h-6 w-6" />
                )}
                <span className="text-xs font-semibold">{action.label}</span>
            </Button>
        ))}
      </div>
       <div className="mt-4 p-3 bg-green-900/20 border border-green-500/20 rounded-md">
            <Text className="text-green-400 text-xs flex items-center gap-2">
                <Check className="h-3 w-3" />
                Otomasyon motoru aktif ve hazır.
            </Text>
       </div>
    </Card>
  )
}
