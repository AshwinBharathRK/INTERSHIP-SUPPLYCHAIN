import React from "react";
import { motion } from "framer-motion";

export const PageHeader = ({ title, subtitle, actions, aurora = true }) => (
  <div className="relative mb-5 overflow-hidden md:mb-6">
    {aurora && <div className="aurora-band" />}
    <div className="relative flex flex-wrap items-end justify-between gap-3">
      <div>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-xl font-semibold tracking-tight md:text-2xl"
        >
          {title}
        </motion.h2>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="mt-1 max-w-2xl text-xs text-muted-foreground md:text-sm"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  </div>
);
