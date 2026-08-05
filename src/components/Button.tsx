type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  fullWidth?: boolean
}

const estilosBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed'

const estilosPorVariante: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-950/40 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]',
  secondary:
    'border border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white',
  danger:
    'border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200',
  ghost: 'text-zinc-300 hover:bg-white/5 hover:text-white',
}

function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const largura = fullWidth ? 'w-full' : ''

  return (
    <button
      className={`${estilosBase} ${estilosPorVariante[variant]} ${largura} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
