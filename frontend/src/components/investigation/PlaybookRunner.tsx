import { useState } from 'react'
import { Card, Title, Text, ProgressBar, Badge, Accordion, AccordionHeader, AccordionBody, AccordionList } from '@tremor/react'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Step {
  id: string
  title: string
  description: string
  completed: boolean
}

interface PlaybookProps {
  title: string
  steps: Step[]
}

export function PlaybookRunner({ title, steps: initialSteps }: PlaybookProps) {
  const [steps, setSteps] = useState(initialSteps)
  
  const completedCount = steps.filter(s => s.completed).length
  const progress = Math.round((completedCount / steps.length) * 100)

  const toggleStep = (id: string) => {
    setSteps(curr => 
      curr.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
           <Title>Playbook: {title}</Title>
           <Text>Standart Müdahale Prosedürü (SOP)</Text>
        </div>
        <Badge size="lg" color={progress === 100 ? 'green' : 'blue'}>
            {progress}% Tamamlandı
        </Badge>
      </div>

      <ProgressBar value={progress} color="blue" className="mb-6" />

      <AccordionList className="flex-1 overflow-y-auto pr-2">
        {steps.map((step) => (
          <Accordion key={step.id}>
            <AccordionHeader>
               <div className="flex items-center gap-3 w-full">
                 <button 
                   onClick={(e) => {
                     e.stopPropagation()
                     toggleStep(step.id)
                   }}
                   className={`p-1 rounded-full border-2 ${step.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-500 text-transparent'}`}
                 >
                   <CheckCircle className="h-4 w-4" />
                 </button>
                 <span className={step.completed ? 'text-green-500 line-through' : 'text-gray-200'}>
                    {step.title}
                 </span>
               </div>
            </AccordionHeader>
            <AccordionBody>
              <div className="pl-9 space-y-3">
                 <Text>{step.description}</Text>
                 {!step.completed && (
                     <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => toggleStep(step.id)}
                        className="flex items-center gap-2"
                     >
                        Tamamlandı Olarak İşaretle <ArrowRight className="h-4 w-4" />
                     </Button>
                 )}
              </div>
            </AccordionBody>
          </Accordion>
        ))}
      </AccordionList>
    </Card>
  )
}
