import { React } from 'jimu-core'
import { Button } from 'jimu-ui'
import { CalciteIcon } from 'calcite-components'
import { useTokens } from '../theme'

/**
 * First-run hint banner (playbook Section 10.5, markup verbatim). A small function
 * component so the class-based Widget can use the theme hook, exactly as Print Advanced does.
 */
export interface HelpHintProps {
  title: string
  body: string
  linkLabel: string
  dismissLabel: string
  onOpenHelp: () => void
  onDismiss: () => void
}

const HelpHint: React.FC<HelpHintProps> = ({ title, body, linkLabel, dismissLabel, onOpenHelp, onDismiss }) => {
  const tokens = useTokens()
  return (
    <div role="note" style={{ margin: '0 14px 10px 14px', padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: '10px', background: tokens.infoBg, color: tokens.text, border: `1px solid ${tokens.divider}`, borderLeft: `3px solid ${tokens.primary}`, borderRadius: tokens.radius, fontSize: '12px', lineHeight: 1.5 }}>
      <span style={{ color: tokens.primary, marginTop: '1px' }} aria-hidden="true"><CalciteIcon icon="lightbulb" scale="s" /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: 'block', marginBottom: '2px' }}>{title}</strong>
        {body}
        {' '}
        <button type="button" onClick={onOpenHelp} style={{ border: 'none', background: 'transparent', padding: 0, color: tokens.primary, cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}>{linkLabel}</button>
      </span>
      <Button size="sm" type="tertiary" icon onClick={onDismiss} title={dismissLabel} aria-label={dismissLabel}>
        <CalciteIcon icon="x" scale="s" />
      </Button>
    </div>
  )
}

export default HelpHint
