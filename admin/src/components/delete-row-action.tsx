"use client"

import { useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/api/error-message"

/**
 * The Delete button every admin list carries, on request: a confirmation,
 * the call, a refresh of the list and a toast.
 *
 * "Delete" means what the API means by it on that entity -- a soft delete
 * (hidden, restorable, audit trail kept) everywhere except a role, which the
 * API only lets go once nobody holds it. When the API refuses ("still
 * assigned to 2 users"), its own message is what the toast shows.
 *
 * Wrapped so no click inside it reaches the row: users, roles and properties
 * open their record when a row is clicked, and confirming a delete must not
 * also navigate.
 */
export function DeleteRowAction({
  title,
  description,
  successMessage,
  onDelete,
  invalidateKey,
}: {
  title: string
  description: string
  successMessage: string
  onDelete: () => Promise<unknown>
  invalidateKey: readonly unknown[]
}) {
  const c = useTranslations("common")
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  async function confirm() {
    try {
      await onDelete()
      await queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success(successMessage)
    } catch (error) {
      toast.error(getErrorMessage(error, c("unknownError")))
    }
  }

  return (
    <div onClick={(event) => event.stopPropagation()} className="flex justify-end">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-3.5" aria-hidden />
        {c("delete")}
      </Button>
      {open && (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title={title}
          description={description}
          onConfirm={confirm}
          confirmLabel={c("delete")}
        />
      )}
    </div>
  )
}
