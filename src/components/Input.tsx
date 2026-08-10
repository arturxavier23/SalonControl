type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

const estilosCampo =
  'w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-ink placeholder:text-ink-subtle outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'

function Input({ label, className = '', id, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm text-ink-muted">
          {label}
        </label>
      )}
      <input id={id} className={`${estilosCampo} ${className}`} {...props} />
    </div>
  )
}

export default Input
