"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { rolesApi, usersApi } from "@/lib/api/endpoints"
import { applyFieldErrors, isApiError } from "@/lib/api/errors"
import { getErrorMessage } from "@/lib/api/error-message"
import { bilingualName } from "@/lib/format"
import { queryKeys } from "@/lib/query/keys"
import type { UserCreate } from "@/lib/api/types"

const PASSWORD_MIN_LENGTH = 10

function useCreateUserSchema() {
  const v = useTranslations("validation")
  return z.object({
    email: z.string().min(1, v("emailRequired")).email(v("emailInvalid")),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, v("passwordMin", { min: PASSWORD_MIN_LENGTH })),
    full_name: z.string().min(1, v("fullNameRequired")),
    phone_e164: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/, v("phoneE164"))
      .or(z.literal(""))
      .optional(),
  })
}

type FormValues = z.infer<ReturnType<typeof useCreateUserSchema>>
const FIELD_NAMES = ["email", "password", "full_name", "phone_e164"] as const

export function CreateUserDialog() {
  const t = useTranslations("users")
  const c = useTranslations("common")
  const locale = useLocale()
  const schema = useCreateUserSchema()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(new Set())

  const rolesQuery = useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: ({ signal }) => rolesApi.list(signal),
    enabled: open,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", full_name: "", phone_e164: "" },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      form.reset()
      setSelectedRoleIds(new Set())
    }
  }

  function toggleRole(roleId: number, checked: boolean) {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(roleId)
      else next.delete(roleId)
      return next
    })
  }

  async function onSubmit(values: FormValues) {
    const payload: UserCreate = {
      email: values.email,
      password: values.password,
      full_name: values.full_name,
      phone_e164: values.phone_e164 ? values.phone_e164 : null,
    }
    let createdUserId: number
    try {
      const user = await usersApi.create(payload)
      createdUserId = user.id
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        const unmatched = applyFieldErrors(error, form.setError, FIELD_NAMES)
        if (unmatched.length > 0) {
          toast.error(unmatched.map((f) => f.message).join(" "))
        }
        return
      }
      toast.error(getErrorMessage(error, c("unknownError")))
      return
    }

    // The user account exists at this point regardless of what happens below,
    // so role-assignment failures are reported but never roll back or block.
    const failedRoles: string[] = []
    for (const roleId of selectedRoleIds) {
      try {
        await usersApi.assignRole(createdUserId, { role_id: roleId })
      } catch {
        const role = rolesQuery.data?.find((r) => r.id === roleId)
        failedRoles.push(role ? bilingualName(role, locale) : String(roleId))
      }
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    toast.success(t("created"))
    if (failedRoles.length > 0) {
      toast.error(
        t("roles.assignFailedOnCreate", { roles: failedRoles.join(", ") })
      )
    }
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button>{t("newUser")}</Button>} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("createDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.fullName")}</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.password")}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription>{t("hints.passwordOnCreate")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_e164"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("fields.phone")}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({c("optional")})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      dir="ltr"
                      placeholder="+965XXXXXXXX"
                      autoComplete="tel"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex flex-col gap-0.5">
                <Label>
                  {t("roles.title")}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({c("optional")})
                  </span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("roles.assignAtCreationHint")}
                </p>
              </div>

              <div className="flex max-h-40 flex-col gap-2 overflow-y-auto py-1">
                {(rolesQuery.data ?? []).map((role) => (
                  <div key={role.id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`create-user-role-${role.id}`}
                      checked={selectedRoleIds.has(role.id)}
                      onCheckedChange={(checked) =>
                        toggleRole(role.id, checked === true)
                      }
                    />
                    <Label
                      htmlFor={`create-user-role-${role.id}`}
                      className="font-normal"
                    >
                      {role.name_ar} · {role.name_en}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                {c("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? c("creating") : c("create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
