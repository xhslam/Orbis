import { useMemo, useSyncExternalStore, type ComponentProps } from 'react'
import { App } from '../../kernel/ui'
import {
  buildFontFamily,
  getMarginPixels,
  getReadingDisplaySettings,
  hasReadingDisplaySettings,
  onReadingDisplaySettingsChange,
} from '../reading/display-settings'

const snapshot = () => (hasReadingDisplaySettings() ? getReadingDisplaySettings() : null)

/** The host injects its shared typography without coupling the kernel to browser storage. */
export function PaperApp(props: ComponentProps<typeof App>) {
  const settings = useSyncExternalStore(onReadingDisplaySettingsChange, snapshot)
  const display = useMemo(
    () =>
      settings
        ? {
            contentWidth:
              settings.contentWidth === '0'
                ? null
                : Number(settings.contentWidth) * settings.fontSize,
            pageMargin: getMarginPixels(settings.pageMargin),
            fontSize: settings.fontSize,
            fontFamily: buildFontFamily(settings.latinFont, settings.cjkFont),
            lineHeight: Number(settings.lineHeight),
          }
        : null,
    [settings],
  )
  return <App {...props} readingDisplay={display} />
}
