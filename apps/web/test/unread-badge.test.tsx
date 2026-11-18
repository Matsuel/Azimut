import { expect, mock, test } from "bun:test"
import { render, screen } from "@testing-library/react"

mock.module("../src/features/notifications/hook", () => ({ useUnreadCount: () => ({ data: { count: 3 } }) }))

const { UnreadBadge } = await import("../src/features/notifications/unread-badge")

test("le compteur garde son texte clair sur fond primary au survol et sur l'onglet actif du menu", () => {
    render(<UnreadBadge />)
    const classes = screen.getByText("3").className.split(" ")

    expect(classes).toContain("text-primary-foreground")
    expect(classes).toContain("peer-hover/menu-button:text-primary-foreground")
    expect(classes).toContain("peer-data-active/menu-button:text-primary-foreground")
    expect(classes).not.toContain("peer-hover/menu-button:text-sidebar-accent-foreground")
})
