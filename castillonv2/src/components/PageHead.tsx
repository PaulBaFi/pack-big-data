import { Plus } from "lucide-react";

function PageHead({
  title,
  desc,
  action,
  onAction,
  children,
}: {
  title?: string;
  desc: string;
  action?: string;
  onAction?: () => void;
  children: any;
}) {
  return (
    <>
      <div className="page-head" style={{ marginBottom: 16 }}>
        <div>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13.5 }}>{desc}</p>
        </div>
        {action && (
          <button className="btn primary" onClick={onAction}>
            <Plus size={17} />
            {action}
          </button>
        )}
      </div>
      {children}
    </>
  );
}

export default PageHead;
