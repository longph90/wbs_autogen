'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

interface TaskData {
  id: string;
  name: string;
  effort: number;
  startDate: string;
  endDate: string;
  percentComplete: string;
  resourceName: string;
  dependencies: string[]; // Array of task IDs this task depends on
  remainingEffortInEndDay?: number; // Remaining effort available in the end day
}

interface FormData {
  ticketID: string;
  developer: string;
  ba: string;
  startDate: string;
}

interface EffortSummary {
  developmentPhase: number; // design + coding + unittest + functiontest
  uatSupport: number; // UAT & Support
  goLive: number; // Go-live
  total: number;
}

export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    ticketID: '',
    developer: '',
    ba: '',
    startDate: ''
  });
  
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [showWBS, setShowWBS] = useState(false);

  // Function to calculate effort summary
  const calculateEffortSummary = (tasks: TaskData[]): EffortSummary => {
    const developmentPhase = tasks
      .filter(task => ['design', 'coding', 'unittest', 'functiontest'].includes(task.id))
      .reduce((sum, task) => sum + task.effort, 0);
    
    const uatSupport = tasks
      .filter(task => task.id === 'uatsupport')
      .reduce((sum, task) => sum + task.effort, 0);
    
    const goLive = tasks
      .filter(task => task.id === 'golive')
      .reduce((sum, task) => sum + task.effort, 0);
    
    const total = developmentPhase + uatSupport + goLive;
    
    return {
      developmentPhase,
      uatSupport,
      goLive,
      total
    };
  };

  // Function to export to Excel
  const exportToExcel = () => {
    if (tasks.length === 0) {
      alert('No WBS data to export');
      return;
    }

    const summary = calculateEffortSummary(tasks);
    
    // Create structured data with indentation
    const excelData = [
      // Row 1: Ticket ID
      {
        'Task Name': formData.ticketID || 'WBS',
        'Effort (Days)': '',
        'Start Date': '',
        'End Date': '',
        '% Complete': '',
        'Resource Name': ''
      },
      // Row 2: Phase I - Update logic report
      {
        'Task Name': '\tI.Update logic report',
        'Effort (Days)': summary.developmentPhase,
        'Start Date': '',
        'End Date': '',
        '% Complete': '',
        'Resource Name': ''
      },
      // Rows 3-6: Development tasks (design, coding, unittest, functiontest)
      ...tasks
        .filter(task => ['design', 'coding', 'unittest', 'functiontest'].includes(task.id))
        .map(task => ({
          'Task Name': `\t\t${task.name}`,
          'Effort (Days)': task.effort,
          'Start Date': task.startDate ? new Date(task.startDate).toLocaleDateString() : '',
          'End Date': task.endDate ? new Date(task.endDate).toLocaleDateString() : '',
          '% Complete': task.percentComplete || '0%',
          'Resource Name': task.resourceName || ''
        })),
      // Row 7: Phase II - UAT & Support
      {
        'Task Name': '\tII.UAT & Support',
        'Effort (Days)': summary.uatSupport,
        'Start Date': '',
        'End Date': '',
        '% Complete': '',
        'Resource Name': ''
      },
      // Row 8: UAT & Support task details
      ...tasks
        .filter(task => task.id === 'uatsupport')
        .map(task => ({
          'Task Name': `\t\t${task.name}`,
          'Effort (Days)': task.effort,
          'Start Date': task.startDate ? new Date(task.startDate).toLocaleDateString() : '',
          'End Date': task.endDate ? new Date(task.endDate).toLocaleDateString() : '',
          '% Complete': task.percentComplete || '0%',
          'Resource Name': task.resourceName || ''
        })),
      // Row 9: Phase III - Go Live
      {
        'Task Name': '\tIII.Go Live',
        'Effort (Days)': summary.goLive,
        'Start Date': '',
        'End Date': '',
        '% Complete': '',
        'Resource Name': ''
      },
      // Row 10: Go Live task details
      ...tasks
        .filter(task => task.id === 'golive')
        .map(task => ({
          'Task Name': `\t\t${task.name}`,
          'Effort (Days)': task.effort,
          'Start Date': task.startDate ? new Date(task.startDate).toLocaleDateString() : '',
          'End Date': task.endDate ? new Date(task.endDate).toLocaleDateString() : '',
          '% Complete': task.percentComplete || '0%',
          'Resource Name': task.resourceName || ''
        }))
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const colWidths = [
      { wch: 35 }, // Task Name (wider for indentation)
      { wch: 12 }, // Effort (Days)
      { wch: 12 }, // Start Date
      { wch: 12 }, // End Date
      { wch: 12 }, // % Complete
      { wch: 20 }  // Resource Name
    ];
    ws['!cols'] = colWidths;

    // Initialize the range
    if (!ws['!ref']) {
      ws['!ref'] = 'A1:F' + (excelData.length + 1);
    }
    
    // Apply formatting - Bold style for important rows
    const applyBoldToRow = (rowIndex: number) => {
      for (let col = 0; col < 6; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
        if (!ws[cellAddress]) {
          ws[cellAddress] = { v: '', t: 's' };
        }
        ws[cellAddress].s = {
          font: { bold: true }
        };
      }
    };

    // Apply bold to header row (row 0)
    applyBoldToRow(0);

    // Calculate the actual row positions in the data
    let currentDataRow = 1; // Start after header row
    
    // Row 1: Ticket ID - Bold
    applyBoldToRow(currentDataRow);
    currentDataRow++;
    
    // Row 2: Phase I - Bold
    applyBoldToRow(currentDataRow);
    currentDataRow += 1 + tasks.filter(task => ['design', 'coding', 'unittest', 'functiontest'].includes(task.id)).length;
    
    // Phase II row - Bold
    applyBoldToRow(currentDataRow);
    currentDataRow += 1 + tasks.filter(task => task.id === 'uatsupport').length;
    
    // Phase III row - Bold
    applyBoldToRow(currentDataRow);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'WBS Tasks');

    // Write file with proper options to preserve formatting
    XLSX.writeFile(wb, `${formData.ticketID || 'WBS'}.xlsx`, {
      bookType: 'xlsx',
      cellStyles: true
    });
  };

  // Function to calculate end date based on start date and effort
  const calculateEndDate = (startDate: string, effort: number, usedEffortInStartDay: number = 0): string => {
    const result = new Date(startDate);
    let remainingEffort = effort;
    
    // First, use the available effort in the start day
    const availableEffortInStartDay = 1 - usedEffortInStartDay;
    const effortUsedInStartDay = Math.min(remainingEffort, availableEffortInStartDay);
    remainingEffort -= effortUsedInStartDay;
    
    // If no remaining effort, task completes on start day
    if (remainingEffort <= 0) {
      return result.toISOString().split('T')[0];
    }
    
    // If we still have remaining effort, move to next business days
    while (remainingEffort > 0) {
      // Move to next business day
      do {
        result.setDate(result.getDate() + 1);
      } while (result.getDay() === 0 || result.getDay() === 6); // Skip weekends
      
      // Use up to 1 full day of effort
      const effortUsedInThisDay = Math.min(remainingEffort, 1);
      remainingEffort -= effortUsedInThisDay;
    }
    
    return result.toISOString().split('T')[0];
  };

  // Function to calculate remaining effort in the end day
  const calculateRemainingEffortInEndDay = (effort: number, prevTaskRemainingEffort: number = 0): number => {
    // Công thức mới: remainingEffortInEndDay = 1 - (effort % 1) + remainingEffortInEndDay của task trước
    const fractionalEffort = effort % 1;
    const remaining = 1 - fractionalEffort + prevTaskRemainingEffort;
    
    // Nếu remaining >= 1, có nghĩa là task kết thúc vào cuối ngày đầy đủ
    if (remaining >= 1) {
      return remaining - Math.floor(remaining);
    }
    
    return remaining;
  };



  // Function to get the start date and used effort from previous day
  const getNextAvailableDate = (dependencyEndDate: string, dependencyRemainingEffort: number): { startDate: string, usedEffortInStartDay: number } => {
    if (dependencyRemainingEffort > 0) {
      // Nếu remainingEffortInEndDay > 0, start date = end date của task trước
      return {
        startDate: dependencyEndDate,
        usedEffortInStartDay: 1 - dependencyRemainingEffort
      };
    } else {
      // Ngược lại thì + 1 ngày (next business day)
      const result = new Date(dependencyEndDate);
      
      do {
        result.setDate(result.getDate() + 1);
      } while (result.getDay() === 0 || result.getDay() === 6); // Skip weekends
      
      return {
        startDate: result.toISOString().split('T')[0],
        usedEffortInStartDay: 0
      };
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEffortChange = (taskId: string, effort: number) => {
    setTasks(prev => {
      const updatedTasks = [...prev];
      const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) return prev;
      
      // Update the changed task's effort
      updatedTasks[taskIndex] = { 
        ...updatedTasks[taskIndex], 
        effort: Math.max(0.1, effort)
      };
      
      // Recalculate ALL tasks from scratch to ensure consistency
      const recalculateAllTasks = (tasks: TaskData[]) => {
        const result = [...tasks];
        
        // Multiple passes to handle cascading dependencies
        for (let pass = 0; pass < 10; pass++) {
          let hasChanges = false;
          
          // First, recalculate tasks with no dependencies
          for (let i = 0; i < result.length; i++) {
            const task = result[i];
            
            if (task.dependencies.length === 0) {
              // No dependencies - ensure end date is calculated correctly
              if (task.startDate) {
                const newEndDate = calculateEndDate(task.startDate, task.effort);
                const newRemainingEffort = calculateRemainingEffortInEndDay(task.effort, 0);
                if (result[i].endDate !== newEndDate) {
                  result[i] = {
                    ...result[i],
                    endDate: newEndDate,
                    remainingEffortInEndDay: newRemainingEffort
                  };
                  hasChanges = true;
                }
              }
            }
          }
          
          // Then, recalculate tasks with dependencies
          for (let i = 0; i < result.length; i++) {
            const task = result[i];
            
            if (task.dependencies.length > 0) {
              // Find the latest end date among dependencies
              let latestEndDate = '';
              let allDependenciesCalculated = true;
              
              for (const depId of task.dependencies) {
                const depTask = result.find(t => t.id === depId);
                if (depTask && depTask.endDate) {
                  if (!latestEndDate || depTask.endDate > latestEndDate) {
                    latestEndDate = depTask.endDate;
                  }
                } else {
                  allDependenciesCalculated = false;
                  break;
                }
              }
              
            if (allDependenciesCalculated && latestEndDate) {
              // Find the dependency task with the latest end date to get its remaining effort
              let latestDependencyRemainingEffort = 0;
              for (const depId of task.dependencies) {
                const depTask = result.find((t: TaskData) => t.id === depId);
                if (depTask && depTask.endDate === latestEndDate) {
                  latestDependencyRemainingEffort = depTask.remainingEffortInEndDay || 0;
                  break;
                }
              }
              
              const nextAvailable = getNextAvailableDate(latestEndDate, latestDependencyRemainingEffort);
              const newStartDate = nextAvailable.startDate;
              const newEndDate = calculateEndDate(newStartDate, task.effort, nextAvailable.usedEffortInStartDay);
              const newRemainingEffort = calculateRemainingEffortInEndDay(task.effort, latestDependencyRemainingEffort);
              
              if (result[i].startDate !== newStartDate || result[i].endDate !== newEndDate) {
                result[i] = {
                  ...result[i],
                  startDate: newStartDate,
                  endDate: newEndDate,
                  remainingEffortInEndDay: newRemainingEffort
                };
                hasChanges = true;
              }
              }
            }
          }
          
          // If no changes in this pass, we're done
          if (!hasChanges) break;
        }
        
        return result;
      };
      
      // Recalculate everything
      return recalculateAllTasks(updatedTasks);
    });
  };

  const generateWBS = () => {
    if (!formData.ticketID || !formData.developer || !formData.ba || !formData.startDate) {
      alert('Please fill in all required fields');
      return;
    }

    const baseTasks: TaskData[] = [
      {
        id: 'design',
        name: 'Task Design',
        effort: 1,
        startDate: formData.startDate,
        endDate: calculateEndDate(formData.startDate, 1),
        percentComplete: '',
        resourceName: formData.ba,
        dependencies: [],
        remainingEffortInEndDay: calculateRemainingEffortInEndDay(1, 0)
      },
      {
        id: 'coding',
        name: 'Task Coding',
        effort: 1,
        startDate: '',
        endDate: '',
        percentComplete: '',
        resourceName: formData.developer,
        dependencies: ['design'],
        remainingEffortInEndDay: 0
      },
      {
        id: 'unittest',
        name: 'Task Unit Test',
        effort: 1,
        startDate: '',
        endDate: '',
        percentComplete: '',
        resourceName: formData.developer,
        dependencies: ['coding'],
        remainingEffortInEndDay: 0
      },
      {
        id: 'functiontest',
        name: 'Task Function Test',
        effort: 1,
        startDate: '',
        endDate: '',
        percentComplete: '',
        resourceName: formData.ba,
        dependencies: ['unittest'],
        remainingEffortInEndDay: 0
      },
      {
        id: 'uatsupport',
        name: 'Task UAT & Support',
        effort: 1,
        startDate: '',
        endDate: '',
        percentComplete: '',
        resourceName: '',
        dependencies: ['functiontest'],
        remainingEffortInEndDay: 0
      },
      {
        id: 'golive',
        name: 'Task Conduct Go-live',
        effort: 1,
        startDate: '', // Should be calculated from dependencies
        endDate: '',
        percentComplete: '',
        resourceName: '',
        dependencies: ['uatsupport'],
        remainingEffortInEndDay: 0
      }
    ];

    // Calculate all task dates based on dependencies
    const calculateAllTaskDates = (tasks: TaskData[]) => {
      const updatedTasks = [...tasks];
      
      // Multiple passes to handle cascading dependencies
      for (let pass = 0; pass < 10; pass++) {
        let hasChanges = false;
        
        // Process all tasks in each pass
        for (let i = 0; i < updatedTasks.length; i++) {
          const task = updatedTasks[i];
          
          if (task.dependencies.length === 0) {
            // No dependencies - ensure end date is calculated
            if (task.startDate) {
              const newEndDate = calculateEndDate(task.startDate, task.effort);
              const newRemainingEffort = calculateRemainingEffortInEndDay(task.effort, 0);
              if (updatedTasks[i].endDate !== newEndDate) {
                updatedTasks[i] = {
                  ...updatedTasks[i],
                  endDate: newEndDate,
                  remainingEffortInEndDay: newRemainingEffort
                };
                hasChanges = true;
              }
            }
          } else {
            // Has dependencies - find the latest end date among them
            let latestEndDate = '';
            let allDependenciesCalculated = true;
            
            for (const depId of task.dependencies) {
              const depTask = updatedTasks.find(t => t.id === depId);
              if (depTask && depTask.endDate) {
                if (!latestEndDate || depTask.endDate > latestEndDate) {
                  latestEndDate = depTask.endDate;
                }
              } else {
                allDependenciesCalculated = false;
                break;
              }
            }
            
            if (allDependenciesCalculated && latestEndDate) {
              // Find the dependency task with the latest end date to get its remaining effort
              let latestDependencyRemainingEffort = 0;
              for (const depId of task.dependencies) {
                const depTask = updatedTasks.find((t: TaskData) => t.id === depId);
                if (depTask && depTask.endDate === latestEndDate) {
                  latestDependencyRemainingEffort = depTask.remainingEffortInEndDay || 0;
                  break;
                }
              }
              
              const nextAvailable = getNextAvailableDate(latestEndDate, latestDependencyRemainingEffort);
              const newStartDate = nextAvailable.startDate;
              const newEndDate = calculateEndDate(newStartDate, task.effort, nextAvailable.usedEffortInStartDay);
              const newRemainingEffort = calculateRemainingEffortInEndDay(task.effort, latestDependencyRemainingEffort);
              
              if (updatedTasks[i].startDate !== newStartDate || updatedTasks[i].endDate !== newEndDate) {
                updatedTasks[i] = {
                  ...updatedTasks[i],
                  startDate: newStartDate,
                  endDate: newEndDate,
                  remainingEffortInEndDay: newRemainingEffort
                };
                hasChanges = true;
              }
            }
          }
        }
        
        // If no changes in this pass, we're done
        if (!hasChanges) break;
      }
      
      return updatedTasks;
    };

    const finalTasks = calculateAllTaskDates(baseTasks);
    setTasks(finalTasks);
    setShowWBS(true);
  };

  return (
    <div className="min-h-screen p-8 bg-slate-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">
          WBS Auto Generator
        </h1>
        
        {/* Input Form */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-xl mb-8 border border-slate-700">
          <h2 className="text-xl font-semibold mb-4 text-white">Project Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Ticket ID *
              </label>
              <input
                type="text"
                name="ticketID"
                value={formData.ticketID}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-slate-400"
                placeholder="Enter ticket ID"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Developer *
              </label>
              <input
                type="text"
                name="developer"
                value={formData.developer}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-slate-400"
                placeholder="Enter developer name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                BA *
              </label>
              <input
                type="text"
                name="ba"
                value={formData.ba}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-slate-400"
                placeholder="Enter BA name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white"
              />
            </div>
          </div>
          
          <button
            onClick={generateWBS}
            className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-800 font-medium transition-colors duration-200"
          >
            Auto Gen WBS
          </button>
        </div>

        {/* WBS Tasks Table */}
        {showWBS && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {(() => {
                const summary = calculateEffortSummary(tasks);
                return (
                  <>
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-lg shadow-xl border border-blue-500">
                      <h3 className="text-lg font-semibold text-white mb-2">Development Phase</h3>
                      <p className="text-sm text-blue-100 mb-2">Design + Coding + Unit Test + Function Test</p>
                      <p className="text-3xl font-bold text-white">{summary.developmentPhase.toFixed(1)}</p>
                      <p className="text-sm text-blue-100">days</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-lg shadow-xl border border-green-500">
                      <h3 className="text-lg font-semibold text-white mb-2">UAT & Support</h3>
                      <p className="text-sm text-green-100 mb-2">User Acceptance Testing & Support</p>
                      <p className="text-3xl font-bold text-white">{summary.uatSupport.toFixed(1)}</p>
                      <p className="text-sm text-green-100">days</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-lg shadow-xl border border-purple-500">
                      <h3 className="text-lg font-semibold text-white mb-2">Go-Live</h3>
                      <p className="text-sm text-purple-100 mb-2">Conduct Go-live Activities</p>
                      <p className="text-3xl font-bold text-white">{summary.goLive.toFixed(1)}</p>
                      <p className="text-sm text-purple-100">days</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Total Summary */}
            <div className="bg-slate-800 p-4 rounded-lg shadow-xl border border-slate-700 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-white">Total Project Effort</h3>
                  <p className="text-2xl font-bold text-blue-400">{calculateEffortSummary(tasks).total.toFixed(1)} days</p>
                </div>
                <button
                  onClick={exportToExcel}
                  className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-slate-800 font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export to Excel
                </button>
              </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700">
              <h2 className="text-xl font-semibold mb-4 text-white">Work Breakdown Structure</h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-600">
                <thead>
                  <tr className="bg-slate-700">
                    <th className="border border-slate-600 px-4 py-2 text-left text-slate-200 font-medium">Task Name</th>
                    <th className="border border-slate-600 px-4 py-2 text-left text-slate-200 font-medium">Dependencies</th>
                    <th className="border border-slate-600 px-4 py-2 text-left text-slate-200 font-medium">Effort (Days)</th>
                    <th className="border border-slate-600 px-4 py-2 text-left text-slate-200 font-medium">Start Date</th>
                    <th className="border border-slate-600 px-4 py-2 text-left text-slate-200 font-medium">End Date</th>
                    <th className="border border-slate-600 px-4 py-2 text-left text-slate-200 font-medium">% Complete</th>
                    <th className="border border-slate-600 px-4 py-2 text-left text-slate-200 font-medium">Resource Name</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-700 transition-colors duration-200">
                      <td className="border border-slate-600 px-4 py-2 font-medium text-white">
                        {task.name}
                      </td>
                      <td className="border border-slate-600 px-4 py-2 text-slate-200 text-sm">
                        {task.dependencies.length > 0 ? task.dependencies.join(', ') : '-'}
                      </td>
                      <td className="border border-slate-600 px-4 py-2">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={task.effort}
                          onChange={(e) => handleEffortChange(task.id, parseFloat(e.target.value) || 0.1)}
                          className="w-full px-2 py-1 bg-slate-700 border border-slate-500 rounded text-center text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                      </td>
                      <td className="border border-slate-600 px-4 py-2 text-slate-200">
                        {task.startDate ? new Date(task.startDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="border border-slate-600 px-4 py-2 text-slate-200">
                        {task.endDate ? new Date(task.endDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="border border-slate-600 px-4 py-2">
                        <input
                          type="text"
                          value={task.percentComplete}
                          onChange={(e) => {
                            const value = e.target.value;
                            setTasks(prev => prev.map(t => 
                              t.id === task.id ? { ...t, percentComplete: value } : t
                            ));
                          }}
                          className="w-full px-2 py-1 bg-slate-700 border border-slate-500 rounded text-center text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                          placeholder="0%"
                        />
                      </td>
                      <td className="border border-slate-600 px-4 py-2 text-slate-200">
                        {task.resourceName || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
