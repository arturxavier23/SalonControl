type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode
}

function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface p-5 shadow-lg shadow-black/5 backdrop-blur-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
