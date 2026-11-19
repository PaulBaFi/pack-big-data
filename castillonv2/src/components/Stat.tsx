import { TrendingUp } from "lucide-react";

function Stat({
  icon: Icon,
  label,
  value,
  note,
  color,
}: {
  icon: any;
  label: string;
  value: any;
  note: string;
  color: string;
}) {
  return (
    <div className="stat">
      <div className={`stat-icon ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small className="positive">{note}</small>
      </div>
      <TrendingUp size={17} className="trend" />
    </div>
  );
}

export default Stat;
