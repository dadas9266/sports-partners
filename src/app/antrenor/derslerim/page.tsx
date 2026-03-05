"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";
import Link from "next/link";

type LessonStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

interface Lesson {
  id: string;
  scheduledAt: string | null;
  completedAt: string | null;
  status: LessonStatus;
  trainerNotes: string | null;
  homeworkText: string | null;
  createdAt: string;
}

interface Enrollment {
  id: string;
  studentId: string;
  sportName: string | null;
  totalLessons: number;
  usedLessons: number;
  notes: string | null;
  status: EnrollmentStatus;
  createdAt: string;
  student: {
    id: string;
    name: string;
    avatarUrl: string | null;
    city: { name: string } | null;
  };
  lessons?: Lesson[];
  _count?: { lessons: number };
}

const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  SCHEDULED: "Planlandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
  NO_SHOW: "Gelmedi",
};
const LESSON_STATUS_COLORS: Record<LessonStatus, string> = {
  SCHEDULED: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  COMPLETED: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  CANCELLED: "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
  NO_SHOW: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300",
};

export default function AntrenorDerslerimPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showNewStudent, setShowNewStudent] = useState(false);
  const [newStudentSearch, setNewStudentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [newForm, setNewForm] = useState({ studentId: "", studentName: "", sportName: "", totalLessons: 10 });
  const [creating, setCreating] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [lessonForm, setLessonForm] = useState({ scheduledAt: "", trainerNotes: "", homeworkText: "", status: "SCHEDULED" as LessonStatus });
  const [addingLesson, setAddingLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/auth/giris");
    }
  }, [sessionStatus, router]);

  const loadEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trainer/enrollments?status=ALL");
      const json = await res.json();
      if (json.success) setEnrollments(json.data);
    } catch { toast.error("Öğrenci listesi yüklenemedi"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated") loadEnrollments();
  }, [sessionStatus, loadEnrollments]);

  const loadDetail = async (enrollmentId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/trainer/enrollments/${enrollmentId}`);
      const json = await res.json();
      if (json.success) setSelectedEnrollment(json.data);
    } catch { toast.error("Detay yüklenemedi"); }
    finally { setDetailLoading(false); }
  };

  // Öğrenci arama
  useEffect(() => {
    if (!newStudentSearch.trim() || newStudentSearch.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(newStudentSearch)}&type=user&limit=8`);
        const json = await res.json();
        setSearchResults(json.data?.users ?? json.users ?? []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [newStudentSearch]);

  const handleCreateEnrollment = async () => {
    if (!newForm.studentId) { toast.error("Öğrenci seçin"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/trainer/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: newForm.studentId,
          sportName: newForm.sportName || undefined,
          totalLessons: newForm.totalLessons,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Öğrenci kaydedildi ✓");
        setShowNewStudent(false);
        setNewForm({ studentId: "", studentName: "", sportName: "", totalLessons: 10 });
        loadEnrollments();
      } else {
        toast.error(json.error || "Hata oluştu");
      }
    } catch { toast.error("Sunucu hatası"); }
    finally { setCreating(false); }
  };

  const handleAddLesson = async () => {
    if (!selectedEnrollment) return;
    setAddingLesson(true);
    try {
      const res = await fetch("/api/trainer/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: selectedEnrollment.id,
          scheduledAt: lessonForm.scheduledAt ? new Date(lessonForm.scheduledAt).toISOString() : null,
          trainerNotes: lessonForm.trainerNotes || null,
          homeworkText: lessonForm.homeworkText || null,
          status: lessonForm.status,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Ders eklendi ✓");
        setShowAddLesson(false);
        setLessonForm({ scheduledAt: "", trainerNotes: "", homeworkText: "", status: "SCHEDULED" });
        await loadDetail(selectedEnrollment.id);
        loadEnrollments();
      } else {
        toast.error(json.error || "Hata oluştu");
      }
    } catch { toast.error("Sunucu hatası"); }
    finally { setAddingLesson(false); }
  };

  const handleUpdateLesson = async (lessonId: string, data: Partial<{ status: LessonStatus; trainerNotes: string; homeworkText: string }>) => {
    if (!selectedEnrollment) return;
    try {
      const res = await fetch(`/api/trainer/lessons?id=${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Güncellendi ✓");
        setEditingLesson(null);
        await loadDetail(selectedEnrollment.id);
        loadEnrollments();
      } else {
        toast.error(json.error || "Hata");
      }
    } catch { toast.error("Sunucu hatası"); }
  };

  const handleUpdateEnrollmentStatus = async (enrollmentId: string, status: EnrollmentStatus) => {
    try {
      const res = await fetch(`/api/trainer/enrollments/${enrollmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Kayıt güncellendi ✓");
        loadEnrollments();
        if (selectedEnrollment?.id === enrollmentId) {
          setSelectedEnrollment((prev) => prev ? { ...prev, status } : null);
        }
      } else {
        toast.error(json.error || "Hata");
      }
    } catch { toast.error("Sunucu hatası"); }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">📚 Ders Takibi</h1>
            <p className="text-xs text-gray-400 mt-0.5">{enrollments.filter(e => e.status === "ACTIVE").length} aktif öğrenci</p>
          </div>
          <button
            onClick={() => setShowNewStudent(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            + Öğrenci Ekle
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Öğrenci Listesi */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Öğrenciler</h2>
          {enrollments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-700">
              <p className="text-4xl mb-2">🎓</p>
              <p className="text-sm text-gray-400">Henüz öğrenci kaydı yok.</p>
              <button onClick={() => setShowNewStudent(true)} className="mt-3 text-sm text-emerald-600 dark:text-emerald-400 hover:underline">İlk öğrenciyi ekle →</button>
            </div>
          ) : (
            enrollments.map((e) => {
              const remaining = e.totalLessons - e.usedLessons;
              const progress = e.totalLessons > 0 ? Math.round((e.usedLessons / e.totalLessons) * 100) : 0;
              const isSelected = selectedEnrollment?.id === e.id;
              return (
                <button
                  key={e.id}
                  onClick={() => { loadDetail(e.id); }}
                  className={`w-full text-left bg-white dark:bg-gray-800 rounded-2xl border-2 p-4 transition hover:shadow-md ${isSelected ? "border-emerald-500" : "border-gray-100 dark:border-gray-700"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-base font-bold text-emerald-600 shrink-0 overflow-hidden">
                      {e.student.avatarUrl ? <img src={e.student.avatarUrl} alt={e.student.name} className="w-full h-full object-cover" /> : e.student.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{e.student.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${e.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                          {e.status === "ACTIVE" ? "Aktif" : e.status === "COMPLETED" ? "Tamamlandı" : "İptal"}
                        </span>
                      </div>
                      {e.sportName && <p className="text-xs text-gray-400">{e.sportName}</p>}
                      {/* İlerleme çubuğu */}
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                          <span>{e.usedLessons}/{e.totalLessons} ders</span>
                          <span className={remaining <= 2 && e.status === "ACTIVE" ? "text-orange-500 font-semibold" : ""}>{remaining} kaldı</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : progress >= 70 ? "bg-orange-400" : "bg-emerald-500"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Sağ Panel: Seçili Öğrenci Detayı */}
        {selectedEnrollment ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4 h-fit sticky top-24">
            {detailLoading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>
            ) : (
              <>
                {/* Öğrenci başlık */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center font-bold text-emerald-600 overflow-hidden">
                      {selectedEnrollment.student.avatarUrl ? <img src={selectedEnrollment.student.avatarUrl} alt={selectedEnrollment.student.name} className="w-full h-full object-cover" /> : selectedEnrollment.student.name.charAt(0)}
                    </div>
                    <div>
                      <Link href={`/profil/${selectedEnrollment.student.id}`} className="font-semibold text-gray-800 dark:text-gray-100 hover:underline">
                        {selectedEnrollment.student.name}
                      </Link>
                      {selectedEnrollment.sportName && <p className="text-xs text-gray-400">{selectedEnrollment.sportName}</p>}
                    </div>
                  </div>
                  {/* Durum güncelle */}
                  <select
                    value={selectedEnrollment.status}
                    onChange={(e) => handleUpdateEnrollmentStatus(selectedEnrollment.id, e.target.value as EnrollmentStatus)}
                    className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 outline-none"
                  >
                    <option value="ACTIVE">Aktif</option>
                    <option value="COMPLETED">Tamamlandı</option>
                    <option value="CANCELLED">İptal</option>
                  </select>
                </div>

                {/* Ders özet */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Toplam", value: selectedEnrollment.totalLessons, color: "text-gray-700 dark:text-gray-200" },
                    { label: "Tamamlanan", value: selectedEnrollment.usedLessons, color: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Kalan", value: selectedEnrollment.totalLessons - selectedEnrollment.usedLessons, color: (selectedEnrollment.totalLessons - selectedEnrollment.usedLessons) <= 2 ? "text-orange-500" : "text-gray-700 dark:text-gray-200" },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl py-2 px-1">
                      <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                      <p className="text-[10px] text-gray-400">{item.label}</p>
                    </div>
                  ))}
                </div>

                {/* Genel notlar */}
                {selectedEnrollment.notes && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-xl p-3">
                    <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1">📝 Genel Not</p>
                    <p className="text-xs text-yellow-800 dark:text-yellow-300 whitespace-pre-wrap">{selectedEnrollment.notes}</p>
                  </div>
                )}

                {/* Ders Listesi */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dersler</h3>
                    {selectedEnrollment.status === "ACTIVE" && (
                      <button onClick={() => setShowAddLesson(true)} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium">+ Ders Ekle</button>
                    )}
                  </div>

                  {(!selectedEnrollment.lessons || selectedEnrollment.lessons.length === 0) ? (
                    <p className="text-xs text-gray-400 text-center py-4">Henüz ders kaydı yok.</p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {selectedEnrollment.lessons.map((lesson, idx) => (
                        <div key={lesson.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 font-mono w-5 shrink-0">{idx + 1}.</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LESSON_STATUS_COLORS[lesson.status]}`}>
                                {LESSON_STATUS_LABELS[lesson.status]}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {/* Hızlı durum butonları */}
                              {lesson.status === "SCHEDULED" && (
                                <>
                                  <button onClick={() => handleUpdateLesson(lesson.id, { status: "COMPLETED" })} className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-lg hover:opacity-80">✓ Tamam</button>
                                  <button onClick={() => handleUpdateLesson(lesson.id, { status: "NO_SHOW" })} className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded-lg hover:opacity-80">Gelmedi</button>
                                </>
                              )}
                              <button onClick={() => setEditingLesson(lesson)} className="text-[10px] text-gray-400 hover:text-gray-600 border border-gray-200 dark:border-gray-600 px-2 py-0.5 rounded-lg">✏️</button>
                            </div>
                          </div>
                          {lesson.scheduledAt && (
                            <p className="text-xs text-gray-400 ml-7">📅 {format(new Date(lesson.scheduledAt), "d MMM yyyy, HH:mm", { locale: tr })}</p>
                          )}
                          {lesson.trainerNotes && (
                            <p className="text-xs text-gray-600 dark:text-gray-300 ml-7 mt-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2 py-1">{lesson.trainerNotes}</p>
                          )}
                          {lesson.homeworkText && (
                            <p className="text-xs text-blue-600 dark:text-blue-300 ml-7 mt-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2 py-1">📚 {lesson.homeworkText}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="hidden md:flex bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 items-center justify-center text-center">
            <div>
              <p className="text-4xl mb-2">👈</p>
              <p className="text-sm text-gray-400">Soldan bir öğrenci seç</p>
            </div>
          </div>
        )}
      </div>

      {/* Yeni Öğrenci Modal */}
      {showNewStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowNewStudent(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">🎓 Yeni Öğrenci Ekle</h2>

            {/* Öğrenci Arama */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Öğrenci Ara</label>
              {newForm.studentId ? (
                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-3 py-2">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">✓ {newForm.studentName}</p>
                  <button onClick={() => setNewForm({ ...newForm, studentId: "", studentName: "" })} className="text-xs text-gray-400 hover:text-red-500">✕</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={newStudentSearch}
                    onChange={(e) => setNewStudentSearch(e.target.value)}
                    placeholder="İsim ile ara..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {(searchLoading || searchResults.length > 0) && (
                    <div className="absolute z-10 w-full top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {searchLoading ? (
                        <p className="text-xs text-gray-400 text-center py-3">Aranıyor...</p>
                      ) : (
                        searchResults.map((u: any) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setNewForm({ ...newForm, studentId: u.id, studentName: u.name });
                              setNewStudentSearch("");
                              setSearchResults([]);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left text-sm"
                          >
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center font-bold text-emerald-600 text-xs shrink-0 overflow-hidden">
                              {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" /> : u.name?.charAt(0)}
                            </div>
                            <p className="text-gray-800 dark:text-gray-200 font-medium">{u.name}</p>
                            {u.city && <p className="text-gray-400 text-xs ml-auto">{u.city.name}</p>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spor Dalı <span className="text-gray-400">(opsiyonel)</span></label>
              <input type="text" value={newForm.sportName} onChange={(e) => setNewForm({ ...newForm, sportName: e.target.value })} placeholder="Örn: Tenis, Fitness..." className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paket (Ders Sayısı)</label>
              <input type="number" min={1} max={200} value={newForm.totalLessons} onChange={(e) => setNewForm({ ...newForm, totalLessons: parseInt(e.target.value) || 1 })} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowNewStudent(false)} className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">İptal</button>
              <button onClick={handleCreateEnrollment} disabled={creating || !newForm.studentId} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-60">
                {creating ? "Ekleniyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ders Ekle Modal */}
      {showAddLesson && selectedEnrollment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowAddLesson(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">📅 Ders Ekle</h2>
            <p className="text-xs text-gray-400">Öğrenci: <span className="font-medium text-gray-700 dark:text-gray-300">{selectedEnrollment.student.name}</span></p>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tarih/Saat <span className="text-gray-400">(opsiyonel)</span></label>
              <input type="datetime-local" value={lessonForm.scheduledAt} onChange={(e) => setLessonForm({ ...lessonForm, scheduledAt: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Durum</label>
              <select value={lessonForm.status} onChange={(e) => setLessonForm({ ...lessonForm, status: e.target.value as LessonStatus })} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none">
                <option value="SCHEDULED">Planlandı</option>
                <option value="COMPLETED">Tamamlandı</option>
                <option value="CANCELLED">İptal</option>
                <option value="NO_SHOW">Gelmedi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ders Notu <span className="text-gray-400">(opsiyonel)</span></label>
              <textarea value={lessonForm.trainerNotes} onChange={(e) => setLessonForm({ ...lessonForm, trainerNotes: e.target.value })} rows={2} placeholder="Ders ile ilgili notlar..." className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none resize-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ödev/Egzersiz <span className="text-gray-400">(opsiyonel)</span></label>
              <textarea value={lessonForm.homeworkText} onChange={(e) => setLessonForm({ ...lessonForm, homeworkText: e.target.value })} rows={2} placeholder="Bir sonraki derse kadar yapılacaklar..." className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none resize-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowAddLesson(false)} className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">İptal</button>
              <button onClick={handleAddLesson} disabled={addingLesson} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-60">
                {addingLesson ? "Ekleniyor..." : "Dersi Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ders Düzenle Modal */}
      {editingLesson && selectedEnrollment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setEditingLesson(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">✏️ Ders Düzenle</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Durum</label>
              <select
                value={editingLesson.status}
                onChange={(e) => setEditingLesson({ ...editingLesson, status: e.target.value as LessonStatus })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none"
              >
                <option value="SCHEDULED">Planlandı</option>
                <option value="COMPLETED">Tamamlandı</option>
                <option value="CANCELLED">İptal</option>
                <option value="NO_SHOW">Gelmedi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ders Notu</label>
              <textarea
                value={editingLesson.trainerNotes ?? ""}
                onChange={(e) => setEditingLesson({ ...editingLesson, trainerNotes: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none resize-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ödev/Egzersiz</label>
              <textarea
                value={editingLesson.homeworkText ?? ""}
                onChange={(e) => setEditingLesson({ ...editingLesson, homeworkText: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none resize-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditingLesson(null)} className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">İptal</button>
              <button
                onClick={() => handleUpdateLesson(editingLesson.id, { status: editingLesson.status, trainerNotes: editingLesson.trainerNotes ?? undefined, homeworkText: editingLesson.homeworkText ?? undefined })}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl transition"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
