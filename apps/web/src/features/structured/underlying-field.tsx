"use client"

import { Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { AppField } from "@/components/form/field"
import { SymbolPicker } from "@/components/symbol-picker"
import { Button } from "@/components/ui/button"
import type { StructuredFormValues } from "./schema"

/** Champ « Sous-jacent » : le symbole choisi, et un bouton qui ouvre la recherche de symboles (n'importe quel titre ou indice de market-service). */
export function UnderlyingField({ onChange }: { onChange: (symbol: string) => void }) {
    const t = useTranslations("pages.structured.form")
    const [open, setOpen] = useState(false)

    return (
        <AppField<StructuredFormValues> name="underlying" label={t("underlying")}>
            {({ field, invalid }) => (
                <>
                    <Button
                        type="button"
                        variant="outline"
                        id={field.name}
                        aria-invalid={invalid}
                        className="w-full justify-between"
                        onClick={() => setOpen(true)}
                    >
                        {field.value}
                        <Search />
                    </Button>
                    <SymbolPicker
                        open={open}
                        onOpenChange={setOpen}
                        onSelect={(item) => {
                            field.onChange(item.symbol)
                            onChange(item.symbol)
                        }}
                    />
                </>
            )}
        </AppField>
    )
}
