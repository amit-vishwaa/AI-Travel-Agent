export default function MessageBody({ text }) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g)
  return (
    <span className="whitespace-pre-line">
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return <strong key={index}>{part.slice(2, -2)}</strong>
        }
        return <span key={index}>{part}</span>
      })}
    </span>
  )
}
