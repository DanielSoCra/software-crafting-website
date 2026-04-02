interface Props {
  title: string;
  icon: string;
  status: 'pending' | 'published' | 'viewed';
  href: string;
}

export default function DeliverableCard({ title, icon, status, href }: Props) {
  const statusConfig = {
    pending: { label: 'In Arbeit', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-400', clickable: false },
    published: { label: 'Bereit', bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700', clickable: true },
    viewed: { label: '✓', bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-600', clickable: true },
  };
  const config = statusConfig[status];
  const content = (
    <div className={`${config.bg} border ${config.border} rounded-xl p-5 transition-shadow ${config.clickable ? 'hover:shadow-md cursor-pointer' : 'opacity-60'}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <span className={`text-xs ${config.text}`}>{config.label}</span>
    </div>
  );
  if (!config.clickable) return content;
  return <a href={href} className="block no-underline">{content}</a>;
}
