<script setup lang="ts">
definePageMeta({ layout: "professor", middleware: "role", roles: ["ADVISOR"] });

type Proposal = { id: number; status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED"; message: string | null; starts_at: string; ends_at: string };
type Booking = {
  id: number; starts_at: string; ends_at: string; subject: string | null;
  student: { id: number; full_name: string }; proposal: Proposal | null;
};
type Slot = { id: number; starts_at: string; ends_at: string };

const api = useApi();
const { data: bookings, refresh, status } = await useAsyncData("tutor-upcoming", async () =>
  (await api<{ data: Booking[] }>("/api/tutors/me/bookings", { query: { scope: "upcoming" } })).data
);

const target = ref<Booking | null>(null);
const slots = ref<Slot[]>([]);
const form = reactive({ availabilityId: "", message: "" });
const error = ref("");
const saving = ref(false);
const notice = ref("");

const cancelTarget = ref<Booking | null>(null);
const cancelReason = ref("");
const cancelError = ref("");
const cancelling = ref(false);

function openCancel(b: Booking) {
  cancelTarget.value = b;
  cancelReason.value = "";
  cancelError.value = "";
}

async function confirmCancel() {
  if (!cancelTarget.value) return;
  cancelError.value = "";
  cancelling.value = true;
  try {
    await api(`/api/tutors/me/bookings/${cancelTarget.value.id}/cancel`, {
      method: "POST",
      body: { reason: cancelReason.value.trim() || undefined },
    });
    cancelTarget.value = null;
    notice.value = "Asesoría cancelada. Esa hora quedó bloqueada y el alumno verá el motivo.";
    await refresh();
  } catch (e: any) {
    cancelError.value = apiError(e);
  } finally {
    cancelling.value = false;
  }
}

async function openPropose(b: Booking) {
  target.value = b;
  form.availabilityId = "";
  form.message = "";
  error.value = "";
  slots.value = [];
  try {
    const res = await api<{ data: Slot[] }>("/api/tutors/me/open-slots");
    slots.value = res.data.filter((s) => s.starts_at !== b.starts_at);
  } catch (e: any) {
    error.value = apiError(e);
  }
}

async function propose() {
  if (!target.value) return;
  error.value = "";
  saving.value = true;
  try {
    await api(`/api/tutors/me/bookings/${target.value.id}/proposals`, {
      method: "POST",
      body: { availability_id: Number(form.availabilityId), message: form.message.trim() || undefined },
    });
    target.value = null;
    notice.value = "Propuesta enviada. La asesoría cambiará de horario cuando el alumno la acepte.";
    await refresh();
  } catch (e: any) {
    error.value = apiError(e);
  } finally {
    saving.value = false;
  }
}

async function cancelProposal(b: Booking) {
  if (!b.proposal) return;
  if (!confirm("¿Cancelar la propuesta de cambio de horario?")) return;
  try {
    await api(`/api/tutors/me/proposals/${b.proposal.id}`, { method: "DELETE" });
    notice.value = "";
    await refresh();
  } catch (e: any) {
    alert(apiError(e));
  }
}

const proposalLabel: Record<string, string> = {
  PENDING: "Propuesta pendiente de respuesta del alumno",
  REJECTED: "El alumno rechazó tu propuesta",
  CANCELLED: "La propuesta ya no es válida (el horario se ocupó)",
};
</script>

<template>
  <div>
    <h1 class="mb-1 text-2xl font-bold">Asesorías agendadas</h1>
    <p class="mb-6 text-sm text-gray-600">
      Puedes cancelar una asesoría, o enviar una propuesta de nuevo horario: en ese caso el alumno decide si la acepta.
    </p>

    <p v-if="notice" class="mb-4 rounded bg-green-50 p-3 text-sm text-green-800">{{ notice }}</p>
    <p v-if="status === 'pending'">Cargando...</p>

    <ul v-else-if="bookings?.length" class="space-y-3">
      <li v-for="b in bookings" :key="b.id" class="rounded-lg bg-white p-5 shadow">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-semibold capitalize">{{ fmtRange(b.starts_at, b.ends_at) }}</p>
            <p class="mt-1 text-sm text-gray-700">
              Alumno: <span class="font-medium">{{ b.student.full_name }}</span>
            </p>
            <p class="mt-2">
              <span class="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">{{ b.subject ?? "Sin materia" }}</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              class="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50" @click="openCancel(b)"
            >Cancelar asesoría</button>
            <button
              v-if="b.proposal?.status === 'PENDING'"
              class="rounded border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50" @click="cancelProposal(b)"
            >Cancelar propuesta</button>
            <button
              v-else
              class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700" @click="openPropose(b)"
            >Proponer otro horario</button>
          </div>
        </div>

        <div
          v-if="b.proposal && proposalLabel[b.proposal.status]"
          class="mt-3 rounded p-3 text-sm"
          :class="b.proposal.status === 'PENDING' ? 'bg-amber-50 text-amber-900' : 'bg-gray-100 text-gray-700'"
        >
          <p class="font-medium">{{ proposalLabel[b.proposal.status] }}</p>
          <p class="capitalize">Horario propuesto: {{ fmtRange(b.proposal.starts_at, b.proposal.ends_at) }}</p>
          <p v-if="b.proposal.message" class="italic">“{{ b.proposal.message }}”</p>
          <button
            v-if="b.proposal.status !== 'PENDING'"
            class="mt-2 text-blue-700 hover:underline" @click="openPropose(b)"
          >Enviar una nueva propuesta</button>
        </div>
      </li>
    </ul>

    <p v-else class="rounded-lg bg-white p-6 text-center text-gray-500 shadow">Todavía no tienes asesorías agendadas.</p>

    <ModalBox v-if="cancelTarget" title="Cancelar asesoría" @close="cancelTarget = null">
      <form class="space-y-3" @submit.prevent="confirmCancel">
        <p class="text-sm text-gray-600">
          Vas a cancelar la asesoría con <b>{{ cancelTarget.student.full_name }}</b>
          ({{ cancelTarget.subject ?? "Sin materia" }}) del <span class="capitalize">{{ fmtShort(cancelTarget.starts_at) }}</span>.
          Esa hora quedará bloqueada y no se podrá reservar de nuevo.
        </p>
        <textarea v-model="cancelReason" rows="3" maxlength="300" placeholder="Motivo para el alumno (opcional)" class="w-full rounded border p-2" />
        <p v-if="cancelError" class="text-sm text-red-600">{{ cancelError }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="rounded border px-4 py-2" @click="cancelTarget = null">Volver</button>
          <button class="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50" :disabled="cancelling">
            {{ cancelling ? "Cancelando..." : "Cancelar asesoría" }}
          </button>
        </div>
      </form>
    </ModalBox>

    <ModalBox v-if="target" title="Proponer otro horario" @close="target = null">
      <form class="space-y-3" @submit.prevent="propose">
        <p class="text-sm text-gray-600">
          Asesoría con <b>{{ target.student.full_name }}</b> ({{ target.subject ?? "Sin materia" }}) —
          <span class="capitalize">{{ fmtShort(target.starts_at) }}</span>
        </p>
        <select v-model="form.availabilityId" class="w-full rounded border p-2" required>
          <option value="" disabled>Elige un horario libre...</option>
          <option v-for="s in slots" :key="s.id" :value="String(s.id)">{{ fmtShort(s.starts_at) }}</option>
        </select>
        <p v-if="!slots.length && !error" class="text-xs text-gray-500">No tienes horarios libres. Abre más horas en Disponibilidad de horarios.</p>
        <textarea v-model="form.message" rows="3" maxlength="300" placeholder="Mensaje para el alumno (opcional)" class="w-full rounded border p-2" />
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="rounded border px-4 py-2" @click="target = null">Cancelar</button>
          <button class="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" :disabled="saving || !form.availabilityId">
            {{ saving ? "Enviando..." : "Enviar propuesta" }}
          </button>
        </div>
      </form>
    </ModalBox>
  </div>
</template>
