import { Bell, MoreHorizontal } from 'lucide-react';
import { ThemeToggle } from '../theme/ThemeToggle';
import { useState } from 'react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';

export function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
      <div className="h-16 px-4 flex items-center justify-between lg:px-6">
        <h2 className="text-lg font-semibold md:hidden">LLM Studio</h2>
        <div className="ml-auto flex items-center space-x-4">
          <button 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1.5 w-2 h-2 bg-primary-500 rounded-full"></span>
          </button>
          <ThemeToggle />
          
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center text-sm gap-2 focus:outline-none"
              aria-label="User menu"
              aria-expanded={isDropdownOpen}
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-medium">
                JD
              </div>
              <span className="hidden md:block font-medium">John Doe</span>
              <MoreHorizontal className="h-4 w-4 text-gray-500" />
            </button>

            {isDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "absolute right-0 mt-2 w-48 py-1 bg-white dark:bg-gray-800 rounded-lg",
                  "shadow-dropdown border border-gray-200 dark:border-gray-700"
                )}
              >
                <div className="px-4 py-2">
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">john@example.com</p>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700"></div>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  Profile
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  API Keys
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700"></div>
                <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  Sign out
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}