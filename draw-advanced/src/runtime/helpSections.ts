import type { HelpSection } from './components/HelpPopup'

/** Flags the widget computes from config. One per feature that has help text.
 *  Computed in widget.tsx with the same `!== false` checks the UI itself uses. */
export interface HelpFeatures {
  myDrawings: boolean
  measurements: boolean
  multipleUnits: boolean
  rememberPrefs: boolean
  snapping: boolean
  buffer: boolean
  importDrawings: boolean
  exportDrawings: boolean
  symbolEditor: boolean
  copyFromMap: boolean
  textTool: boolean
  freehandTools: boolean
  curveTools: boolean
  triangleTool: boolean
  circleTool: boolean
  lock: boolean
  group: boolean
  merge: boolean
  duplicate: boolean
  zoomTo: boolean
}

type T = (id: string, values?: Record<string, any>) => string

export function buildHelpSections (t: T, f: HelpFeatures): HelpSection[] {
  const when = (on: boolean, ...ids: string[]): string[] => (on ? ids.map((id: string) => t(id)) : [])
  const listOf = (parts: string[]): string =>
    parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} ${t('helpAnd')} ${parts[parts.length - 1]}`

  const listActions = listOf([
    ...(f.symbolEditor ? [t('helpActionRestyle')] : []),
    t('helpActionRename'),
    ...(f.zoomTo ? [t('helpActionZoom')] : []),
    ...(f.duplicate ? [t('helpActionDuplicate')] : []),
    t('helpActionDelete')
  ])

  const fileVerbs = listOf([
    ...(f.exportDrawings ? [t('helpFileExport')] : []),
    ...(f.importDrawings ? [t('helpFileImport')] : [])
  ])

  return [
    {
      key: 'start', icon: 'play', title: t('helpStartTitle'), ordered: true,
      body: [t('helpStart1'), t('helpStart2'), ...(f.myDrawings ? [t('helpStart3')] : [t('helpStart3NoList')])]
    },
    {
      key: 'draw', icon: 'pencil', title: t('helpDrawTitle'), intro: t('helpDrawIntro'),
      body: [
        t('helpDrawFinish'),
        t('helpDrawCancel'),
        ...when(f.textTool, 'helpDrawText'),
        ...when(f.freehandTools, 'helpDrawFreehand'),
        ...when(f.curveTools, 'helpDrawCurves'),
        ...when(f.triangleTool, 'helpDrawTriangle'),
        ...when(f.circleTool, 'helpDrawCircle'),
        ...when(f.copyFromMap, 'helpDrawCopyFrom')
      ]
    },
    ...(f.measurements
      ? [{
          key: 'measure', icon: 'measure', title: t('helpMeasureTitle'),
          body: [
            t('helpMeasureOn'),
            t('helpMeasureSegments'),
            t('helpMeasureUnits'),
            ...when(f.multipleUnits, 'helpMeasureAlsoShow'),
            ...when(f.rememberPrefs, 'helpMeasureRemembered')
          ]
        }]
      : []),
    ...(f.snapping || f.buffer
      ? [{
          key: 'precision', icon: 'snap', title: t('helpPrecisionTitle'),
          body: [...when(f.snapping, 'helpSnapping'), ...when(f.buffer, 'helpBuffer', 'helpBufferUnits')]
        }]
      : []),
    ...(f.myDrawings
      ? [{
          key: 'organize', icon: 'list', title: t('helpOrganizeTitle'), intro: t('helpOrganizeIntro'),
          body: [
            t('helpOrganizeSelect'),
            t('helpOrganizeActions', { actions: listActions }),
            ...when(f.lock, 'helpOrganizeLock'),
            ...when(f.group, 'helpOrganizeGroup'),
            ...when(f.merge, 'helpOrganizeMerge'),
            t('helpOrganizeClear')
          ]
        }]
      : []),
    ...(f.myDrawings && (f.exportDrawings || f.importDrawings)
      ? [{
          key: 'share', icon: 'download', title: t('helpShareTitle'),
          body: [
            t('helpShareIntro', { verbs: fileVerbs }),
            ...when(f.exportDrawings, 'helpShareExport'),
            ...when(f.importDrawings, 'helpShareImport')
          ]
        }]
      : []),
    {
      key: 'keep', icon: 'folder', title: t('helpKeepTitle'),
      body: [t('helpKeep1'), t('helpKeep2'), ...when(f.exportDrawings, 'helpKeep3')]
    },
    {
      key: 'trouble', icon: 'exclamation-mark-triangle', title: t('helpTroubleTitle'),
      body: [
        t('helpTroubleNoShape'),
        ...when(f.measurements, 'helpTroubleNoLabels'),
        t('helpTroubleGone'),
        ...when(f.snapping, 'helpTroubleSnap'),
        t('helpTroubleContact')
      ]
    },
    {
      key: 'tips', icon: 'lightbulb', title: t('helpTipsTitle'),
      body: [t('helpTips1'), t('helpTips2'), ...when(f.measurements, 'helpTips3')]
    }
  ]
}
