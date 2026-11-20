import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Mic,
  Square,
  Trash2,
} from 'lucide-react';
import {
  DraftRecipe,
  FamilyRecipeRecord,
  FIELD_LIMITS,
  IndianState,
} from '../types';

interface RecipeSubmissionViewProps {
  isSignedIn: boolean;
  draftRecipe: DraftRecipe;
  saveStatus: 'idle' | 'saving' | 'saved';
  submittedRecipes: FamilyRecipeRecord[];
  onUpdateDraft: (patch: Partial<DraftRecipe>) => void;
  onRequireAuth: () => void;
  onSubmitRecipe: (payload: {
    photoData: string;
    voiceNoteData: string;
  }) => Promise<void>;
}

const STATES: IndianState[] = ['Odisha', 'Uttarakhand', 'West Bengal'];

async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 640;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not process image.'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        if (dataUrl.length > FIELD_LIMITS.PHOTO_DATA_MAX) {
          resolve(canvas.toDataURL('image/jpeg', 0.45));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

export const RecipeSubmissionView: React.FC<RecipeSubmissionViewProps> = ({
  isSignedIn,
  draftRecipe,
  saveStatus,
  submittedRecipes,
  onUpdateDraft,
  onRequireAuth,
  onSubmitRecipe,
}) => {
  const [photoData, setPhotoData] = useState('');
  const [voiceNoteData, setVoiceNoteData] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToDataUrl(file);
      if (compressed.length > FIELD_LIMITS.PHOTO_DATA_MAX) {
        setErrorMsg('Photo is too large even after compression. Please pick a smaller photo.');
        return;
      }
      setPhotoData(compressed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load photo.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const startRecording = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Voice recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 24000,
      });
      audioChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = String(reader.result || '');
          if (result.length > FIELD_LIMITS.VOICE_DATA_MAX) {
            setErrorMsg('Voice note exceeded size limit. Please keep it under 35 seconds.');
          } else {
            setVoiceNoteData(result);
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordSeconds(0);
      setRecording(true);

      timerRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 34) {
            stopRecording();
            return 35;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setErrorMsg('Microphone permission was denied. You can still submit the written recipe & story.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isSignedIn) {
      onRequireAuth();
      return;
    }

    if (draftRecipe.submitterName.trim().length < 2) {
      setErrorMsg('Please enter the recipe-holder name (at least 2 characters).');
      return;
    }
    if (draftRecipe.relationship.trim().length < 2) {
      setErrorMsg('Please tell us the family relation (e.g., Mother, Grandmother, Self).');
      return;
    }
    if (draftRecipe.recipeName.trim().length < 2) {
      setErrorMsg('Please enter the dish name.');
      return;
    }
    if (draftRecipe.ingredients.trim().length < 5) {
      setErrorMsg('Please share the ingredients (memory measures like katori or handfuls are welcome).');
      return;
    }
    if (draftRecipe.steps.trim().length < 5) {
      setErrorMsg('Please write the cooking steps.');
      return;
    }
    if (draftRecipe.story.trim().length < 5) {
      setErrorMsg('Please share the family story or memory behind this dish.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitRecipe({ photoData, voiceNoteData });
      setPhotoData('');
      setVoiceNoteData('');
      setSuccessMsg('Thank you! Your family recipe and story have been saved for our kitchen team.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to submit recipe.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <section className="space-y-2 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Submit your family recipe
          </h1>
          {isSignedIn && saveStatus !== 'idle' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              {saveStatus === 'saving' ? 'Saving draft...' : 'Saved'}
            </span>
          )}
        </div>
        <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          Built for parents, grandparents (50+), and students preserving home kitchens. No exact gram measurements needed—share katoris, pinches, stories, or record a quick voice note.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="rec-holder" className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Recipe-holder&apos;s Name
            </label>
            <input
              id="rec-holder"
              type="text"
              value={draftRecipe.submitterName}
              onChange={(e) => onUpdateDraft({ submitterName: e.target.value })}
              maxLength={FIELD_LIMITS.NAME_MAX}
              placeholder="e.g., Meena Devi"
              required
              className="min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 focus:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label htmlFor="rec-relation" className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Relationship &amp; Age (Optional)
            </label>
            <input
              id="rec-relation"
              type="text"
              value={draftRecipe.relationship}
              onChange={(e) => onUpdateDraft({ relationship: e.target.value })}
              maxLength={FIELD_LIMITS.NAME_MAX}
              placeholder="e.g., Mother, 58 or Self, 65"
              required
              className="min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 focus:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="rec-name" className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Recipe Name
            </label>
            <input
              id="rec-name"
              type="text"
              value={draftRecipe.recipeName}
              onChange={(e) => onUpdateDraft({ recipeName: e.target.value })}
              maxLength={FIELD_LIMITS.RECIPE_NAME_MAX}
              placeholder="e.g., Santula or Kumaoni Raita"
              required
              className="min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 focus:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              State / Region
            </span>
            <div className="grid grid-cols-3 gap-2">
              {STATES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => onUpdateDraft({ state: st })}
                  aria-pressed={draftRecipe.state === st}
                  className={`min-h-[48px] rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                    draftRecipe.state === st
                      ? 'border-amber-700 bg-amber-700 text-white dark:border-amber-500 dark:bg-amber-600'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="rec-ingredients" className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Ingredients (No exact weights required)
          </label>
          <textarea
            id="rec-ingredients"
            rows={3}
            value={draftRecipe.ingredients}
            onChange={(e) => onUpdateDraft({ ingredients: e.target.value })}
            maxLength={FIELD_LIMITS.INGREDIENTS_MAX}
            placeholder="e.g., 1 small bowl toor dal, half a raw papaya, a pinch of panch phoron, mustard oil by eye..."
            required
            className="w-full rounded-xl border border-zinc-300 bg-white p-4 text-base leading-relaxed text-zinc-900 focus:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label htmlFor="rec-steps" className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            How it is cooked
          </label>
          <textarea
            id="rec-steps"
            rows={4}
            value={draftRecipe.steps}
            onChange={(e) => onUpdateDraft({ steps: e.target.value })}
            maxLength={FIELD_LIMITS.STEPS_MAX}
            placeholder="Describe the aroma cues, vessel (iron kadhai or brass handi), and sequence..."
            required
            className="w-full rounded-xl border border-zinc-300 bg-white p-4 text-base leading-relaxed text-zinc-900 focus:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label htmlFor="rec-story" className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            The Memory &amp; Tradition Behind It
          </label>
          <textarea
            id="rec-story"
            rows={3}
            value={draftRecipe.story}
            onChange={(e) => onUpdateDraft({ story: e.target.value })}
            maxLength={FIELD_LIMITS.STORY_MAX}
            placeholder="Who taught this recipe? When is it cooked in your family?"
            required
            className="w-full rounded-xl border border-zinc-300 bg-white p-4 text-base leading-relaxed text-zinc-900 focus:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Photo + Voice Note Row */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Dish Photo */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Dish or Handwritten Note Photo (Optional)
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Upload a photo of the dish or your family recipe diary.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                <Camera className="h-4 w-4" aria-hidden="true" />
                <span>{photoData ? 'Change photo' : 'Choose photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="sr-only"
                />
              </label>
              {photoData && (
                <button
                  type="button"
                  onClick={() => setPhotoData('')}
                  className="inline-flex min-h-[44px] items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              )}
            </div>
            {photoData && (
              <img
                src={photoData}
                alt="Uploaded family recipe preview"
                className="mt-3 h-32 w-full rounded-xl object-cover"
              />
            )}
          </div>

          {/* Voice Note Recorder */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Voice Note Option (Up to 35s)
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Prefer speaking instead of typing? Record the story in your own voice.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              {!recording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-700/40 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  {voiceNoteData ? 'Re-record voice note' : 'Record voice note'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <Square className="h-3.5 w-3.5 fill-white" aria-hidden="true" />
                  Stop ({recordSeconds}s / 35s)
                </button>
              )}

              {voiceNoteData && !recording && (
                <button
                  type="button"
                  onClick={() => setVoiceNoteData('')}
                  className="inline-flex min-h-[44px] items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete audio
                </button>
              )}
            </div>

            {voiceNoteData && !recording && (
              <audio controls src={voiceNoteData} className="mt-3 w-full" />
            )}
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-[52px] w-full rounded-xl bg-amber-700 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-amber-800 disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          {!isSignedIn
            ? 'Sign in to submit your family recipe'
            : submitting
              ? 'Submitting family recipe...'
              : 'Submit Family Recipe & Story'}
        </button>
      </form>

      {/* Submitted Recipes History */}
      {isSignedIn && submittedRecipes.length > 0 && (
        <section className="space-y-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Your Submitted Family Recipes
          </h2>
          <div className="space-y-4">
            {submittedRecipes.map((rec) => (
              <article
                key={rec.recipeId}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {rec.state} · By {rec.submitterName} ({rec.relationship})
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {rec.recipeName}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                    Status: {rec.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {rec.story}
                </p>
                {rec.photoData && (
                  <img
                    src={rec.photoData}
                    alt={rec.recipeName}
                    className="mt-3 max-h-48 rounded-xl object-cover"
                  />
                )}
                {rec.voiceNoteData && (
                  <audio controls src={rec.voiceNoteData} className="mt-3 w-full" />
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
