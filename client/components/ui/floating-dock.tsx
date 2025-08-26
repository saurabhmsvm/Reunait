"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { AnimatePresence, MotionValue, motion, useMotionValue, useSpring, useTransform } from "motion/react"

type DockItem = {
  title: string
  icon: React.ReactNode
  href?: string
  onClick?: () => void
}

export function FloatingDock({
  items,
  desktopClassName,
  mobileClassName,
  children,
}: {
  items: DockItem[]
  desktopClassName?: string
  mobileClassName?: string
  children?: React.ReactNode
}) {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName}>
        {children}
      </FloatingDockDesktop>
      <FloatingDockMobile items={items} className={mobileClassName}>
        {children}
      </FloatingDockMobile>
    </>
  )
}

const FloatingDockMobile = ({
  items,
  className,
  children,
}: {
  items: DockItem[]
  className?: string
  children?: React.ReactNode
}) => {
  const [open, setOpen] = React.useState(false)
  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute inset-x-0 bottom-full mb-2 flex flex-col gap-2"
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10, transition: { delay: idx * 0.05 } }}
                transition={{ delay: (items.length - 1 - idx) * 0.05 }}
              >
                <button
                  onClick={item.onClick}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-card"
                  aria-label={item.title}
                >
                  <div className="h-4 w-4">{item.icon}</div>
                </button>
              </motion.div>
            ))}
            {children && (
              <motion.div
                key="dock-extra-child"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                {children}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-card"
        aria-label="Toggle dock"
      >
        <div className="h-5 w-5 rounded-full bg-foreground/30" />
      </button>
    </div>
  )
}

const FloatingDockDesktop = ({
  items,
  className,
  children,
}: {
  items: DockItem[]
  className?: string
  children?: React.ReactNode
}) => {
  let mouseX = useMotionValue(Infinity)
  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "flex h-10 items-center gap-2 rounded-md border border-border/50 bg-card px-2 py-1 shadow-none",
        className
      )}
    >
      {items.map((item) => (
        <IconContainer mouseX={mouseX} key={item.title} {...item} />
      ))}
      {children}
    </motion.div>
  )
}

function IconContainer({
  mouseX,
  title,
  icon,
  href,
  onClick,
}: {
  mouseX: MotionValue
  title: string
  icon: React.ReactNode
  href?: string
  onClick?: () => void
}) {
  let ref = React.useRef<HTMLDivElement>(null)

  let distance = useTransform(mouseX, (val) => {
    let bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 } as any
    return val - bounds.x - bounds.width / 2
  })

  // Map distance to width/height transforms (fish-eye)
  const baseScale = 0.9
  const maxScale = 1.5
  const easingPower = 3.5
  const radius = 70

  let scaleTransform = useTransform(distance, (d) => {
    const t = Math.max(0, 1 - Math.abs(Number(d)) / radius)
    return baseScale + (maxScale - baseScale) * Math.pow(t, easingPower)
  })
  let scale = useSpring(scaleTransform, { mass: 0.1, stiffness: 150, damping: 12 })

  const [hovered, setHovered] = React.useState(false)

  const Wrapper: any = onClick ? 'button' : 'a'

  return (
    <Wrapper href={href} onClick={onClick} aria-label={title}>
      <motion.div
        ref={ref}
        // Fixed layout box prevents horizontal shift
        style={{ width: 40, height: 40 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex aspect-square items-center justify-center rounded-full bg-transparent text-muted-foreground hover:text-foreground transition-colors"
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: -2, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 2, x: "-50%" }}
              className="absolute top-[calc(100%+6px)] left-1/2 w-fit rounded-sm border px-1.5 py-0.5 text-[11px] whitespace-pre bg-popover text-popover-foreground"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div style={{ scale }} className="flex items-center justify-center">
          {icon}
        </motion.div>
      </motion.div>
    </Wrapper>
  )
}
