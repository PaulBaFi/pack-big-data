function FormActions({ close }: { close: () => void }) {
  return (
    <div className="form-actions">
      <button type="button" className="btn outline" onClick={close}>
        Cancelar
      </button>
      <button className="btn primary" type="submit">
        Guardar registro
      </button>
    </div>
  );
}

export default FormActions;
