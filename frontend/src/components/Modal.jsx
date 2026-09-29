export default function Modal({title,onClose,children}){
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h3>{title}</h3><button className="ghost" onClick={onClose}>Close</button></div>{children}</div></div>
}
