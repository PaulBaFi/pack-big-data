import { X } from "lucide-react";

function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: any;
}) {
  return (
    <div className="modal-back">
      <div className="modal">
        <div className="modal-head">
          <h3>{title}</h3>
          <button onClick={close}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
