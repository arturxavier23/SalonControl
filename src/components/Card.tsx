type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode
}

function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
