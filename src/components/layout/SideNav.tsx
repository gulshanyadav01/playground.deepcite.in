import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Layers, MessageSquare, Settings, Menu, X, Brain, ChevronDown, LineChart } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const trainSteps = [
  { path: '/select-model', label: 'Select Model' },
  { path: '/upload-data', label: 'Upload Data' },
  { path: '/configure', label: 'Configure' },
  { path: '/progress', label: 'Training Progress' },
];

const evaluateSteps = [
  { path: '/evaluate/test-data', label: 'Upload Test Data' },
  { path: '/evaluate/metrics', label: 'View Metrics' },
  { path: '/evaluate/compare', label: 'Compare Models' },
];

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Brain, label: 'Train', path: '/select-model', subItems: trainSteps },
  { icon: LineChart, label: 'Evaluate', path: '/evaluate/test-data', subItems: evaluateSteps },
  { icon: MessageSquare, label: 'Chat', path: '/query' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function SideNav() {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Check if current path is a training or evaluation step
  const isTrainingPath = trainSteps.some(step => step.path === pathname);
  const isEvaluationPath = evaluateSteps.some(step => step.path === pathname);
  
  // Expand appropriate section based on current path
  useEffect(() => {
    if (isTrainingPath) {
      setExpandedItem('/select-model');
    } else if (isEvaluationPath) {
      setExpandedItem('/evaluate/test-data');
    }
  }, [pathname, isTrainingPath, isEvaluationPath]);
  
  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-20 p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      
      <AnimatePresence>
        {(isOpen || true) && (
          <motion.aside
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700",
              "w-64 md:w-72 shrink-0 overflow-y-auto",
              "fixed md:sticky top-0 bottom-0 left-0 z-10 md:z-0",
              isOpen ? "block" : "hidden md:block",
              "md:h-screen"
            )}
          >
            <div className="p-6">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">LaaP Studio</h1>
              </div>
              
              <nav className="mt-8 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.path;
                  const isExpanded = expandedItem === item.path;
                  const hasSubItems = !!item.subItems;
                  const isSubItemActive = hasSubItems && item.subItems.some(subItem => subItem.path === pathname);
                  const Icon = item.icon;
                  
                  return (
                    <div key={item.path}>
                      <div
                        onClick={() => {
                          if (hasSubItems) {
                            setExpandedItem(isExpanded ? null : item.path);
                          } else {
                            setIsOpen(false);
                            navigate(item.path);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                          (isActive || isSubItemActive)
                            ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="flex-1">{item.label}</span>
                        {hasSubItems && (
                          <ChevronDown 
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "transform rotate-180"
                            )} 
                          />
                        )}
                      </div>
                      
                      {hasSubItems && isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="ml-4 mt-1 space-y-1"
                        >
                          {item.subItems.map((subItem, index) => {
                            const isSubActive = pathname === subItem.path;
                            return (
                              <Link
                                key={subItem.path}
                                to={subItem.path}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                  "flex items-center pl-8 py-2 text-sm rounded-md relative",
                                  isSubActive
                                    ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                )}
                              >
                                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mr-2 text-xs font-medium">
                                  {index + 1}
                                </span>
                                {subItem.label}
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}