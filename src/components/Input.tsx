type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

const estilosCampo =
  'w-full rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-2 text-white placeholder:text-zinc-500 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'

function Input({ label, className = '', id, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm text-zinc-400">
          {label}
        </label>
      )}
      <input id={id} className={`${estilosCampo} ${className}`} {...props} />
    </div>
  )
}

export default Input
