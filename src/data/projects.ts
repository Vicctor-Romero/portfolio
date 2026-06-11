import type { useTranslations } from "../i18n/utils";

export interface ProjectData {
    id: string;
    num: string;          // "01"
    category: string;     // "SAAS" | "CLIENT"
    title: string;
    rolePill: string;     // pill text: "Founder & CEO" | "Web"
    roleMeta: string;     // "Product · Engineering · Design"
    listMeta: string;     // home "selected work" meta line
    description: string;
    tags: string[];
    /** internal detail page (or "#") */
    href: string;
    /** external visit link, or null when none */
    visit: { label: string; url: string } | null;
    comingSoon: boolean;
    /** screenshot for the Projects media frame */
    image: string | null;
    tag: string;          // media corner tag, e.g. "[01] GLIDOCS"
}

export const getProjects = (
    t: ReturnType<typeof useTranslations>,
    getLocalizedPath: (path: string) => string
): ProjectData[] => [
        {
            id: "glidocs",
            num: "01",
            category: "SAAS",
            title: "Glidocs",
            rolePill: t("proj.glidocs.pill"),
            roleMeta: t("proj.glidocs.roleMeta"),
            listMeta: t("proj.glidocs.listMeta"),
            description: t("proj.glidocs.desc"),
            tags: ["Next.js", "NestJS", "PostgreSQL", "React Native", "TypeScript"],
            href: "#",
            visit: { label: "glidocs.com", url: "https://glidocs.com" },
            comingSoon: false,
            image: 'https://image.thum.io/get/width/1200/crop/900/https://glidocs.com',
            tag: "[01] GLIDOCS",
        },
        {
            id: "bullseye",
            num: "02",
            category: "CLIENT",
            title: "The Bullseye Builders",
            rolePill: t("proj.common.web"),
            roleMeta: t("proj.bullseye.roleMeta"),
            listMeta: t("proj.bullseye.listMeta"),
            description: t("proj.bullseye.desc"),
            tags: ["React", "Astro", "Responsive", "SEO"],
            href: getLocalizedPath("/projects/thebullseyebuilders"),
            visit: { label: "thebullseyebuilders.com", url: "https://thebullseyebuilders.com" },
            comingSoon: false,
            image: "https://image.thum.io/get/width/1200/crop/900/https://thebullseyebuilders.com",
            tag: "[02] BULLSEYE",
        },
        {
            id: "5star",
            num: "03",
            category: "CLIENT",
            title: "5 Star Caregiving",
            rolePill: t("proj.common.web"),
            roleMeta: t("proj.5star.roleMeta"),
            listMeta: t("proj.5star.listMeta"),
            description: t("proj.5star.desc"),
            tags: ["React", "Responsive", "Accessible", "SEO"],
            href: getLocalizedPath("/projects/5starcare"),
            visit: { label: "5starcaregiving.com", url: "https://5starcaregiving.com" },
            comingSoon: false,
            image: "https://image.thum.io/get/width/1200/crop/900/https://5starcaregiving.com",
            tag: "[03] 5 STAR",
        },
    ];
