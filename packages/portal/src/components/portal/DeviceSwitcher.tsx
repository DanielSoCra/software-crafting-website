'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

const sizes = {
  desktop: { width: '100%', label: 'Desktop' },
  tablet: { width: '768px', label: 'Tablet \u00b7 768px' },
  mobile: { width: '375px', label: 'Mobile \u00b7 375px' },
} as const;

type Device = keyof typeof sizes;

export default function DeviceSwitcher({ srcdocHtml }: { srcdocHtml: string }) {
  const [device, setDevice] = useState<Device>('desktop');

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {(Object.keys(sizes) as Device[]).map((d) => (
          <Button
            key={d}
            variant={device === d ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDevice(d)}
            title={sizes[d].label}
          >
            {d === 'desktop' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>
            )}
            {d === 'tablet' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="18" r="1"/></svg>
            )}
            {d === 'mobile' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="18" r="1"/></svg>
            )}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground ml-2">{sizes[device].label}</span>
      </div>
      <div className="flex justify-center transition-all duration-500 ease-out">
        <iframe
          srcDoc={srcdocHtml}
          sandbox="allow-scripts"
          className="border border-border rounded-lg transition-all duration-500 ease-out"
          style={{ width: sizes[device].width, minHeight: '80vh' }}
        />
      </div>
    </div>
  );
}
