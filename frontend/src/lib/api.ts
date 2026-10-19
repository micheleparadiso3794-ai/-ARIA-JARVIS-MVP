import axios from "axios";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

export const http = axios.create({ baseURL: "/api" });

export type Priority = "Bassa" | "Media" | "Alta" | "Critica";
export type Status = "Da revisionare" | "Assegnato" | "In lavorazione" | "Completato";
export type Variant = "A" | "B";

export interface KeywordMatch {
  keyword: string;
  count: number;
  category: string;
}

export interface TriageResult {
  pred_category: string;
  pred_priority: Priority;
  pred_role: string;
  confidence: number;
  needs_review: boolean;
  ambiguous: boolean;
  reasoning: string;
  matches: KeywordMatch[];
  scores: Record<string, number>;
  priority_keyword: string | null;
  variant: Variant;
  elapsed_ms: number;
}

export interface Request {
  id: number;
  title: string;
  description: string;
  channel: string;
  user_category: string | null;
  user_urgency: string | null;
  notes: string | null;
  created_at: string;
  rule_variant: Variant;
  pred_category: string;
  pred_priority: Priority;
  pred_role: string;
  confidence: number;
  needs_review: boolean;
  reasoning: string;
  matches: KeywordMatch[];
  status: Status;
  final_category: string | null;
  final_priority: Priority | null;
  final_role: string | null;
  correction_reason: string | null;
  reviewed_at: string | null;
}

export interface RequestCreate {
  title: string;
  description: string;
  channel: string;
  user_category?: string;
  user_urgency?: string;
  notes?: string;
  variant?: Variant;
}

export interface ReviewIn {
  final_category: string;
  final_priority: Priority;
  final_role: string;
  reason: string;
}

export interface TestRunSummary {
  id: number;
  run_date: string;
  variant: Variant;
  total_samples: number;
  accuracy_cat: number;
  accuracy_prio: number;
  accuracy_role: number;
  review_rate: number;
  avg_time_ms: number;
  accuracy_auto_only: number;
}

export interface TestResultRow {
  id: number;
  title: string;
  target_cat: string;
  pred_cat: string;
  target_prio: Priority;
  pred_prio: Priority;
  target_role: string;
  pred_role: string;
  confidence: number;
  needs_review: boolean;
  elapsed_ms: number;
}

export interface TestRun extends TestRunSummary {
  results: TestResultRow[];
}

export interface DatasetItem {
  id: number;
  title: string;
  description: string;
  channel: string;
  target_cat: string;
  target_prio: Priority;
  target_role: string;
}

export interface RuleCategory {
  target_role: string;
  keywords: string[];
  default_priority: Priority;
}

export interface RuleSet {
  label: string;
  description: string;
  require_human_review: boolean;
  categories: Record<string, RuleCategory>;
  priority_boosters: Record<string, string[]>;
  confidence_threshold: number;
}

export interface Feedback {
  id: number;
  created_at: string;
  session_id: string;
  worked_well: string;
  unclear_aspects: string;
  errors_found: string;
  suggested_improvements: string;
  priority: Priority;
}

export type FeedbackIn = Omit<Feedback, "id" | "created_at">;

export interface Stats {
  total: number;
  by_status: Record<Status, number>;
  by_category: Record<string, number>;
  by_priority: Record<Priority, number>;
  pending_review: number;
  test_runs: number;
}

export interface Meta {
  categories: string[];
  priorities: Priority[];
  roles: string[];
  channels: string[];
  statuses: Status[];
  variants: Record<Variant, string>;
  default_variant: Variant;
}

const get = <T,>(url: string, params?: object) => http.get<T>(url, { params }).then((r) => r.data);

export const q = {
  meta: () => queryOptions({ queryKey: ["meta"], queryFn: () => get<Meta>("/meta"), staleTime: Infinity }),
  stats: () => queryOptions({ queryKey: ["stats"], queryFn: () => get<Stats>("/stats") }),
  requests: (params: { status?: Status; needs_review?: boolean } = {}) =>
    queryOptions({ queryKey: ["requests", params], queryFn: () => get<Request[]>("/requests", params) }),
  request: (id: number) =>
    queryOptions({ queryKey: ["requests", "one", id], queryFn: () => get<Request>(`/requests/${id}`) }),
  testRuns: () => queryOptions({ queryKey: ["test-runs"], queryFn: () => get<TestRunSummary[]>("/test-runs") }),
  testRun: (id: number) =>
    queryOptions({ queryKey: ["test-runs", id], queryFn: () => get<TestRun>(`/test-runs/${id}`) }),
  compare: () =>
    queryOptions({
      queryKey: ["test-runs", "compare"],
      queryFn: () => get<Record<Variant, TestRunSummary | null>>("/test-runs/compare"),
    }),
  dataset: () =>
    queryOptions({ queryKey: ["dataset"], queryFn: () => get<DatasetItem[]>("/dataset"), staleTime: Infinity }),
  rules: () =>
    queryOptions({
      queryKey: ["rules"],
      queryFn: () => get<Record<Variant, RuleSet>>("/rules"),
      staleTime: Infinity,
    }),
  feedback: () => queryOptions({ queryKey: ["feedback"], queryFn: () => get<Feedback[]>("/feedback") }),
};

export const previewTriage = (body: { title: string; description: string; variant: Variant }) =>
  http.post<TriageResult>("/triage/preview", body).then((r) => r.data);

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

export function useCreateRequest() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: RequestCreate) => http.post<Request>("/requests", body).then((r) => r.data),
    onSuccess: () => invalidate("requests", "stats"),
  });
}

export function useSeedRequests() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => http.post<{ created: number }>("/requests/seed").then((r) => r.data),
    onSuccess: () => invalidate("requests", "stats"),
  });
}

export function useReviewRequest() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...body }: ReviewIn & { id: number }) =>
      http.post<Request>(`/requests/${id}/review`, body).then((r) => r.data),
    onSuccess: () => invalidate("requests", "stats"),
  });
}

export function useSetStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: Status }) =>
      http.patch<Request>(`/requests/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => invalidate("requests", "stats"),
  });
}

export function useRunTest() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (variant: Variant) => http.post<TestRun>("/test-runs", { variant }).then((r) => r.data),
    onSuccess: () => invalidate("test-runs", "stats"),
  });
}

export function useCreateFeedback() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: FeedbackIn) => http.post<Feedback>("/feedback", body).then((r) => r.data),
    onSuccess: () => invalidate("feedback"),
  });
}

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join(", ");
    if (!err.response) return "Il server non risponde. Controlla che il backend sia avviato.";
  }
  return "Operazione non riuscita. Riprova.";
}
