import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSettingsStore, useEDRStore, useSOARStore, useSavedSearchesStore } from '@/store'
import {
  Settings as SettingsIcon,
  Bell,
  Palette,
  Database,
  Link,
  Info,
  Sun,
  Moon,
  Monitor,
  Trash2,
  RotateCcw,
} from 'lucide-react'

export default function Settings() {
  const { settings, updateSetting, updateNestedSetting, resetSettings } = useSettingsStore()
  const { clearState: clearEDRState } = useEDRStore()
  const { clearRuns: clearSOARRuns } = useSOARStore()
  const { clearSearches } = useSavedSearchesStore()
  const [activeTab, setActiveTab] = useState('general')

  const handleClearAllData = () => {
    clearEDRState()
    clearSOARRuns()
    clearSearches()
    toast.success('Tüm yerel veriler temizlendi')
  }

  const handleResetSettings = () => {
    resetSettings()
    toast.success('Ayarlar sıfırlandı')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/20 text-primary">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Ayarlar</h1>
          <p className="text-muted-foreground">
            Uygulama tercihlerini yönetin
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Genel</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Bildirimler</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Görünüm</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Veri</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Link className="h-4 w-4" />
            <span className="hidden sm:inline">Entegrasyon</span>
          </TabsTrigger>
          <TabsTrigger value="about" className="gap-2">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Hakkında</span>
          </TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Genel Ayarlar</CardTitle>
              <CardDescription>
                Temel uygulama ayarlarını yapılandırın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dil</p>
                  <p className="text-sm text-muted-foreground">
                    Arayüz dilini seçin
                  </p>
                </div>
                <Select
                  value={settings.language}
                  onValueChange={(val) => updateSetting('language', val as 'tr' | 'en')}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tr">Türkçe</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Saat Dilimi</p>
                  <p className="text-sm text-muted-foreground">
                    Zaman gösterimi için saat dilimi
                  </p>
                </div>
                <Select
                  value={settings.timezone}
                  onValueChange={(val) => updateSetting('timezone', val)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Istanbul">İstanbul (GMT+3)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="Europe/London">Londra (GMT+0)</SelectItem>
                    <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sidebar Durumu</p>
                  <p className="text-sm text-muted-foreground">
                    Kenar çubuğunu genişletilmiş tut
                  </p>
                </div>
                <Switch
                  checked={settings.sidebarExpanded}
                  onCheckedChange={(checked) => updateSetting('sidebarExpanded', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Bildirim Ayarları</CardTitle>
              <CardDescription>
                Bildirim tercihlerini yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Masaüstü Bildirimleri</p>
                  <p className="text-sm text-muted-foreground">
                    Tarayıcı bildirimleri al
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.desktop}
                  onCheckedChange={(checked) =>
                    updateNestedSetting('notifications', 'desktop', checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Ses Bildirimleri</p>
                  <p className="text-sm text-muted-foreground">
                    Uyarılar için ses çal
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.sound}
                  onCheckedChange={(checked) =>
                    updateNestedSetting('notifications', 'sound', checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Kritik Uyarı Pop-up</p>
                  <p className="text-sm text-muted-foreground">
                    Kritik uyarılar için pop-up göster
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.criticalPopup}
                  onCheckedChange={(checked) =>
                    updateNestedSetting('notifications', 'criticalPopup', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Görünüm</CardTitle>
              <CardDescription>
                Tema ve görsel tercihler
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="font-medium mb-4">Tema</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'dark', label: 'Koyu', icon: Moon },
                    { value: 'light', label: 'Açık', icon: Sun },
                    { value: 'system', label: 'Sistem', icon: Monitor },
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => updateSetting('theme', theme.value as 'dark' | 'light' | 'system')}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        settings.theme === theme.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <theme.icon className="h-6 w-6 mx-auto mb-2" />
                      <p className="text-sm font-medium">{theme.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Tablo Yoğunluğu</p>
                  <p className="text-sm text-muted-foreground">
                    Tablo satır aralığı
                  </p>
                </div>
                <Select
                  value={settings.tableDensity}
                  onValueChange={(val) =>
                    updateSetting('tableDensity', val as 'compact' | 'normal' | 'comfortable')
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Kompakt</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="comfortable">Geniş</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data */}
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Veri ve Depolama</CardTitle>
              <CardDescription>
                Yerel veri yönetimi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-2">
                  Yerel Depolama Kullanımı
                </p>
                <p className="text-2xl font-bold">
                  {(JSON.stringify(localStorage).length / 1024).toFixed(1)} KB
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    clearEDRState()
                    toast.success('EDR durumu temizlendi')
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  EDR Durumunu Temizle
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    clearSOARRuns()
                    toast.success('SOAR geçmişi temizlendi')
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  SOAR Geçmişini Temizle
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    clearSearches()
                    toast.success('Kayıtlı aramalar temizlendi')
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Kayıtlı Aramaları Temizle
                </Button>

                <Separator />

                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={handleClearAllData}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Tüm Yerel Verileri Temizle
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Entegrasyonlar</CardTitle>
              <CardDescription>
                Bağlı sistem durumları (simülasyon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Azure AD', status: 'connected', color: 'text-green-500' },
                  { name: 'Microsoft 365', status: 'connected', color: 'text-green-500' },
                  { name: 'CrowdStrike EDR', status: 'connected', color: 'text-green-500' },
                  { name: 'Splunk SIEM', status: 'limited', color: 'text-yellow-500' },
                  { name: 'ServiceNow', status: 'disconnected', color: 'text-red-500' },
                ].map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary">
                        <Link className="h-4 w-4" />
                      </div>
                      <p className="font-medium">{integration.name}</p>
                    </div>
                    <span className={`text-sm font-medium ${integration.color}`}>
                      {integration.status === 'connected'
                        ? 'Bağlı'
                        : integration.status === 'limited'
                          ? 'Kısıtlı'
                          : 'Bağlı Değil'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* About */}
        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>Hakkında</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-6">
                <div className="inline-flex p-4 rounded-2xl bg-primary/20 text-primary mb-4">
                  <SettingsIcon className="h-12 w-12" />
                </div>
                <h2 className="text-2xl font-bold">SOC Dashboard</h2>
                <p className="text-muted-foreground">v2.0.0 - React Edition</p>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Framework</span>
                  <span>React 18 + TypeScript</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Styling</span>
                  <span>Tailwind CSS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">State</span>
                  <span>Zustand</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Charts</span>
                  <span>Recharts</span>
                </div>
              </div>

              <Separator />

              <Button
                variant="outline"
                className="w-full"
                onClick={handleResetSettings}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Ayarları Sıfırla
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
