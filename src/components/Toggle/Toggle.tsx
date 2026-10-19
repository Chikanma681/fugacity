import styles from './Toggle.module.css'

interface ToggleProps {
  'aria-label'?: string
  className?: string
  offLabel?: string
  onLabel?: string
  name: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  checked: boolean
}

export const Toggle = ({
  className = '',
  offLabel = 'Off',
  onLabel = 'On',
  name = '',
  onChange,
  checked,
  'aria-label': ariaLabel,
}: ToggleProps) => {
  return (
    <label className={`${styles.toggle} ${className}`}>
      <p
        className={checked ? 'text-chalkboard-70 dark:text-chalkboard-50' : ''}
      >
        {offLabel}
      </p>
      <input
        type="checkbox"
        aria-label={ariaLabel}
        name={name}
        id={name}
        checked={checked}
        onChange={onChange}
      />
      <span />
      <p
        className={!checked ? 'text-chalkboard-70 dark:text-chalkboard-50' : ''}
      >
        {onLabel}
      </p>
    </label>
  )
}
