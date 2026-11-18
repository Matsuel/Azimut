import { describe, expect, test } from "bun:test"
import { cn } from "@/lib/utils"

describe("cn", () => {
    test.each(["h1", "h2", "h3", "stat", "body", "body-medium", "body-semibold", "small", "small-medium"])(
        "text-%s (taille du thème) ne supprime pas la couleur du texte",
        (size) => {
            expect(cn("bg-primary text-primary-foreground", `text-${size}`)).toBe(
                `bg-primary text-primary-foreground text-${size}`,
            )
        },
    )

    test("une couleur écrase toujours la précédente", () => {
        expect(cn("text-primary-foreground", "text-muted-foreground")).toBe("text-muted-foreground")
    })

    test("une taille écrase toujours la précédente", () => {
        expect(cn("text-body", "text-small")).toBe("text-small")
    })
})
