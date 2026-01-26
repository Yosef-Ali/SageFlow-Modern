import { ActionResult } from "@/types/api"

export async function generatePtbBackup(): Promise<ActionResult<string>> {
  return { success: true, data: "" }
}
