import { expect, test } from "bun:test"
import { hasAdminRole } from "@azimut/utils/roles"

test("hasAdminRole : admin seul ou dans une liste, espaces tolérés", () => {
    expect(hasAdminRole("admin")).toBe(true)
    expect(hasAdminRole("user, admin")).toBe(true)
    expect(hasAdminRole("user,admin")).toBe(true)
})

test("hasAdminRole : autre rôle, sous-chaîne, null ou absent → faux", () => {
    expect(hasAdminRole("user")).toBe(false)
    expect(hasAdminRole("superadmin")).toBe(false)
    expect(hasAdminRole(null)).toBe(false)
    expect(hasAdminRole(undefined)).toBe(false)
})
