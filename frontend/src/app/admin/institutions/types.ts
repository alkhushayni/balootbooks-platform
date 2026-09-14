export type InstitutionRow = {
  id: string;
  name: string;
  max_license_seats: number | null;
  tenant_domains: { domain_string: string }[];
};

export type ToastState = { tone: "success" | "error"; message: string } | null;
