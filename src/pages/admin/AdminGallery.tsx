import { useState, useEffect, useRef } from 'react';
import { Images, Upload, Trash2, Loader2, X, AlertCircle } from 'lucide-react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSettings } from '@/hooks/useFirestore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface GalleryImage {
  id: string;
  url: string;
  publicId: string;
  name: string;
  createdAt: string;
}

const AdminGallery = () => {
  const { cloudinaryCloudName, cloudinaryUploadPreset, loading: settingsLoading } = useSettings();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setImages(snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryImage)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const uploadToCloudinary = (file: File): Promise<{ url: string; publicId: string }> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', cloudinaryUploadPreset);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100));
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText);
          resolve({ url: res.secure_url, publicId: res.public_id });
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      toast.error('Skonfiguruj Cloudinary w Ustawieniach');
      return;
    }
    setUploading(true);

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name} — to nie jest zdjęcie`); continue; }
      if (file.size > 15 * 1024 * 1024) { toast.error(`${file.name} — za duże (max 15 MB)`); continue; }
      setUploadProgress(0);
      try {
        const { url, publicId } = await uploadToCloudinary(file);
        await addDoc(collection(db, 'gallery'), {
          url, publicId, name: file.name, createdAt: new Date().toISOString(),
        });
        toast.success(`${file.name} — wgrano`);
      } catch {
        toast.error(`Błąd wgrywania ${file.name}`);
      }
    }

    setUploading(false);
    setUploadProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (image: GalleryImage) => {
    setDeletingId(image.id);
    try {
      await deleteDoc(doc(db, 'gallery', image.id));
      toast.success('Zdjęcie usunięte');
    } catch {
      toast.error('Błąd usuwania');
    } finally {
      setDeletingId(null);
    }
  };

  const isConfigured = cloudinaryCloudName && cloudinaryUploadPreset;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Images className="w-6 h-6 text-primary" />
            Galeria
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {images.length} {images.length === 1 ? 'zdjęcie' : 'zdjęć'} — wyświetlają się na stronie głównej
          </p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading || !isConfigured} className="gap-2">
            {uploading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Wgrywanie {uploadProgress}%</>
              : <><Upload className="w-4 h-4" />Dodaj zdjęcia</>}
          </Button>
        </div>
      </div>

      {!settingsLoading && !isConfigured && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Cloudinary nie jest skonfigurowany</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Przejdź do <strong>Ustawienia</strong> i wpisz Cloud Name oraz Upload Preset.</p>
          </div>
        </div>
      )}

      {isConfigured && (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
          onClick={() => !uploading && fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Przeciągnij zdjęcia tutaj lub kliknij żeby wybrać</p>
          <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WEBP — max 15 MB per zdjęcie</p>
        </div>
      )}

      {uploading && (
        <div className="w-full bg-border rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : images.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">Brak zdjęć — dodaj pierwsze zdjęcie do galerii</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map(img => (
            <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden bg-secondary">
              <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer" onClick={() => setPreview(img.url)} />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              <button
                onClick={() => handleDelete(img)}
                disabled={deletingId === img.id}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80"
              >
                {deletingId === img.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
              <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">{img.name}</p>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30" onClick={() => setPreview(null)}>
            <X className="w-5 h-5" />
          </button>
          <img src={preview} alt="Podgląd" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default AdminGallery;
