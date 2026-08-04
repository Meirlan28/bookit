import type { LucideIcon } from 'lucide-react';
import { Globe, Laptop, MonitorSmartphone, Smartphone } from 'lucide-react';

export type DeviceInfo = {
  browser: string;
  system: string;
  Icon: LucideIcon;
};

export function parseUserAgent(userAgent: string | null): DeviceInfo {
  if (!userAgent) {
    return { browser: 'Неизвестный браузер', system: 'Устройство не определено', Icon: Laptop };
  }

  const browser = userAgent.includes('Edg/')
    ? 'Microsoft Edge'
    : userAgent.includes('Chrome/')
      ? 'Google Chrome'
      : userAgent.includes('Firefox/')
        ? 'Mozilla Firefox'
        : userAgent.includes('Safari/')
          ? 'Safari'
          : 'Браузер';

  const system = userAgent.includes('Windows')
    ? 'Windows'
    : userAgent.includes('Android')
      ? 'Android'
      : userAgent.includes('iPhone') || userAgent.includes('iPad')
        ? 'iOS / iPadOS'
        : userAgent.includes('Mac OS')
          ? 'macOS'
          : userAgent.includes('Linux')
            ? 'Linux'
            : 'Неизвестная система';

  const isMobile = /Android|iPhone|iPad|Mobile/i.test(userAgent);
  const Icon = isMobile
    ? Smartphone
    : browser === 'Google Chrome'
      ? Globe
      : MonitorSmartphone;

  return { browser, system, Icon };
}
