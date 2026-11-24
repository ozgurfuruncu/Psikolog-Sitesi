"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Info } from "lucide-react";
import { Button, Modal, api, useToast, Badge, EmptyState } from "./ui";
export type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "checkbox" | "date" | "minute" | "select";
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  help?: string;
};
export type EntityConfig = {
  endpoint: string;
  title: string;
  fields: Field[];
  defaults: Record<string, unknown>;
};
type RecordData = Record<string, unknown> & { id: string };
export function AdminEditor({ config, records }: { config: EntityConfig; records: RecordData[] }) {
  const [editing, setEditing] = useState<RecordData | null>(null),
    [deleting, setDeleting] = useState<RecordData | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fileId, setFileId] = useState<string | null>(null),
    router = useRouter(),
    toast = useToast();
  const title = (r: RecordData) =>
    String(
      r.title ||
        r.name ||
        r.question ||
        r.qualification ||
        (r.dayOfWeek !== undefined
          ? `${["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"][Number(r.dayOfWeek)]} · ${minuteString(Number(r.startMinute))} – ${minuteString(Number(r.endMinute))}`
          : r.reason || r.id),
    );
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      data: Record<string, unknown> = { ...(editing?.id ? { id: editing.id } : {}) };
    setBusy(true);
    setError("");
    try {
      for (const field of config.fields) {
        const value = f.get(field.key);
        data[field.key] =
          field.type === "checkbox"
            ? value === "on"
            : field.type === "number"
              ? value === ""
                ? null
                : Number(value)
              : field.type === "minute"
                ? Number(String(value).split(":")[0]) * 60 + Number(String(value).split(":")[1])
                : field.type === "date"
                  ? value
                    ? new Date(String(value) + "T12:00:00+03:00").toISOString()
                    : null
                  : value;
      }
      if (config.endpoint === "certificates") data.fileId = fileId;
      if (config.endpoint === "blog") data.imageFileId = fileId;
      if (config.endpoint === "availability" && data.date === "") data.date = null;
      if (config.endpoint === "blog" && data.categoryId === "") data.categoryId = null;
      await api(`/api/admin/${config.endpoint}`, data);
      toast("Kayıt kaydedildi.");
      setEditing(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>{config.title}</h2>
          <Button
            className="btn-sm"
            onClick={() => {
              setError("");
              setFileId(null);
              setEditing({ ...config.defaults, id: "" });
            }}
          >
            <Plus size={15} />
            Yeni ekle
          </Button>
        </div>
        {records.length ? (
          records.map((r) => (
            <div className="content-record" key={r.id}>
              <div>
                <h3>{title(r)}</h3>
                <p>
                  {String(r.institution || r.excerpt || r.description || r.reason || "").slice(
                    0,
                    140,
                  )}
                </p>
                {r.published !== undefined && <Badge>{r.published ? "Yayında" : "Taslak"}</Badge>}
                {r.active !== undefined && <Badge>{r.active ? "Aktif" : "Pasif"}</Badge>}
                {r.order !== undefined && (
                  <span className="small muted" style={{ marginLeft: 10, fontSize: ".7rem" }}>
                    Sıra: {String(r.order)}
                  </span>
                )}
              </div>
              <div className="content-record-actions">
                <button
                  className="icon-btn"
                  aria-label={`${title(r)} kaydını düzenle`}
                  onClick={() => {
                    setError("");
                    setEditing(r);
                    setFileId(
                      typeof r.fileId === "string"
                        ? r.fileId
                        : typeof r.imageFileId === "string"
                          ? r.imageFileId
                          : null,
                    );
                  }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={`${title(r)} kaydını kaldır`}
                  onClick={() => {
                    setError("");
                    setDeleting(r);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="Henüz kayıt yok"
            description="Yeni ekle düğmesiyle ilk kaydınızı oluşturabilirsiniz."
          />
        )}
      </div>
      <Modal
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.id ? "Kaydı düzenleyin" : "Yeni kayıt oluşturun"}
        description={`${config.title} alanındaki bilgiler kaydedilecektir.`}
      >
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <form method="post" key={editing?.id || "new"} onSubmit={submit}>
          <div className="admin-form-grid">
            {config.fields.map((field) => (
              <EditorField
                field={field}
                value={editing?.[field.key] ?? config.defaults[field.key]}
                key={field.key}
              />
            ))}
            {["certificates", "blog"].includes(config.endpoint) && (
              <div className="full-span">
                <div className="notice">
                  <Info size={17} />
                  <p>
                    {config.endpoint === "blog"
                      ? "Yayın hakkına sahip olduğunuz PNG veya JPEG kapak görselini yükleyin (en çok 5 MB)."
                      : "Yalnızca yayın izni olan, kişisel bilgileri maskelenmiş PDF, PNG veya JPEG yükleyin (en çok 5 MB). Dosya denetimi antivirüs taramasının yerini tutmaz."}
                  </p>
                </div>
                <div className="field">
                  <label htmlFor="certificate-file">
                    {config.endpoint === "blog" ? "Yazı kapak görseli" : "Belge dosyası"}
                  </label>
                  <input
                    id="certificate-file"
                    type="file"
                    accept={config.endpoint === "blog" ? ".jpg,.jpeg,.png" : ".pdf,.jpg,.jpeg,.png"}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBusy(true);
                      try {
                        const form = new FormData();
                        form.append("file", file);
                        const response = await fetch("/api/files", { method: "POST", body: form });
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.error);
                        setFileId(data.id);
                        toast("Dosya özel depoya yüklendi.");
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                  <small>
                    {fileId ? "Belge dosyası kayda bağlandı." : "Henüz dosya yüklenmedi."}
                  </small>
                </div>
              </div>
            )}
          </div>
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Vazgeç
            </Button>
            <Button loading={busy} type="submit">
              Kaydet
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Kaydı kaldırın"
        description="Bağlı operasyonel kayıtlar korunur. Hizmetler silinmek yerine pasif yapılır."
      >
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <p className="small">
          <strong>{deleting && title(deleting)}</strong> kaydını kaldırmak istediğinize emin
          misiniz?
        </p>
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Vazgeç
          </Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={async () => {
              if (!deleting) return;
              setBusy(true);
              try {
                await api(`/api/admin/${config.endpoint}`, { id: deleting.id }, "DELETE");
                setDeleting(null);
                toast("Kayıt kaldırıldı.");
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Kaldır
          </Button>
        </div>
      </Modal>
    </>
  );
}
function minuteString(n: number) {
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}
export function EditorField({ field: f, value }: { field: Field; value: unknown }) {
  const id = `editor-${f.key}`;
  if (f.type === "checkbox")
    return (
      <label className="checkbox-field full-span">
        <input type="checkbox" name={f.key} defaultChecked={!!value} />
        <span>
          {f.label}
          {f.help && <small style={{ display: "block" }}>{f.help}</small>}
        </span>
      </label>
    );
  const stringValue =
    f.type === "date" && value
      ? String(value).slice(0, 10)
      : f.type === "minute"
        ? minuteString(Number(value || 0))
        : String(value ?? "");
  return (
    <div className={`field ${f.type === "textarea" ? "full-span" : ""}`}>
      <label htmlFor={id}>{f.label}</label>
      {f.type === "textarea" ? (
        <textarea
          id={id}
          name={f.key}
          defaultValue={stringValue}
          required={f.required}
          maxLength={50000}
        />
      ) : f.type === "select" ? (
        <select id={id} name={f.key} defaultValue={stringValue}>
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={f.key}
          type={f.type === "minute" ? "time" : f.type || "text"}
          defaultValue={stringValue}
          required={f.required}
          {...(f.type === "number"
            ? { step: 1 }
            : f.type === "minute"
              ? { step: 1800 }
              : { maxLength: 3000 })}
        />
      )}
      {f.help && <small>{f.help}</small>}
    </div>
  );
}
export function AdminForm({
  endpoint,
  fields,
  values,
  title,
}: {
  endpoint: string;
  fields: Field[];
  values: Record<string, unknown>;
  title: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    toast = useToast(),
    router = useRouter();
  return (
    <form
      method="post"
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          data: Record<string, unknown> = {};
        fields.forEach((field) => {
          data[field.key] =
            field.type === "checkbox"
              ? f.get(field.key) === "on"
              : field.type === "number"
                ? Number(f.get(field.key))
                : f.get(field.key);
        });
        setBusy(true);
        setError("");
        try {
          await api(`/api/admin/${endpoint}`, data);
          toast("Değişiklikler kaydedildi.");
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>{title}</h3>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <div className="admin-form-grid">
        {fields.map((f) => (
          <EditorField key={f.key} field={f} value={values[f.key]} />
        ))}
      </div>
      <Button type="submit" loading={busy}>
        Değişiklikleri kaydet
      </Button>
    </form>
  );
}
