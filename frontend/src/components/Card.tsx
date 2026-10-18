/** Simple card container */
export default function Card({
  title, children, className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
      {title && <h2 className="font-semibold text-gray-800 mb-3 text-base">{title}</h2>}
      {children}
    </div>
  );
}
