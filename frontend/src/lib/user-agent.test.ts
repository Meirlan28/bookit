import {
  Globe,
  Laptop,
  MonitorSmartphone,
  Smartphone,
} from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { parseUserAgent } from './user-agent';

describe('parseUserAgent', () => {
  it('returns a useful fallback when no user-agent is available', () => {
    expect(parseUserAgent(null)).toEqual({
      browser: 'Неизвестный браузер',
      system: 'Устройство не определено',
      Icon: Laptop,
    });
  });

  it('recognizes desktop Chrome on Windows', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        + 'AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
    );

    expect(result).toEqual({
      browser: 'Google Chrome',
      system: 'Windows',
      Icon: Globe,
    });
  });

  it('prefers Edge over the Chrome marker contained in an Edge user-agent', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        + 'AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
    );

    expect(result).toEqual({
      browser: 'Microsoft Edge',
      system: 'Windows',
      Icon: MonitorSmartphone,
    });
  });

  it('recognizes mobile Safari on iOS and selects a mobile icon', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) '
        + 'AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1',
    );

    expect(result).toEqual({
      browser: 'Safari',
      system: 'iOS / iPadOS',
      Icon: Smartphone,
    });
  });

  it('recognizes Firefox on Linux', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
    );

    expect(result).toEqual({
      browser: 'Mozilla Firefox',
      system: 'Linux',
      Icon: MonitorSmartphone,
    });
  });
});
