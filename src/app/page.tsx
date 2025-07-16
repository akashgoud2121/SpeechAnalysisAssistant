
'use client';

import { useState, useRef, useEffect } from 'react';
import { analyze } from '@/ai/flows/analyze';
import type { AnalyzeSpeechOutput, EvaluationCriterion } from '@/ai/flows/schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from '@/hooks/use-toast';
import { Mic, StopCircle, LoaderCircle, BookOpenText, MessageCircleWarning, Waves, Languages, BookCopy, BarChart4, BotMessageSquare, Gauge, FileClock, Hourglass, Download, ClipboardCheck, Presentation, MessageSquareQuote, AudioLines, BrainCircuit, CheckCircle, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import jsPDF from 'jspdf';
import { ThemeToggle } from '@/components/theme-toggle';


// For TS compatibility with browser SpeechRecognition API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const Step = ({ number, title, children }: { number: number, title: string, children: React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg flex-shrink-0 mt-1">
            {number}
        </div>
        <div className="w-full">
            <h2 className="text-2xl font-headline font-semibold mb-4">{title}</h2>
            {children}
        </div>
    </div>
);

export default function Home() {
  const [isLiveRecording, setIsLiveRecording] = useState(false);
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalyzeSpeechOutput | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('presentation');
  const [inputMode, setInputMode] = useState<InputMode>('live');
  const [question, setQuestion] = useState('');
  const [perfectAnswer, setPerfectAnswer] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);


  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let final_transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                }
            }
            if (final_transcript) {
                setTranscript(prev => prev + final_transcript);
            }
        };

        recognition.onerror = (event) => {
            if (event.error === 'network' || event.error === 'no-speech' || event.error === 'audio-capture') {
                return;
            }
            console.error('Speech recognition error:', event.error);
            toast({
                variant: "destructive",
                title: "Speech Recognition Error",
                description: `An error occurred: ${event.error}`,
            });
            setIsLiveRecording(false);
        };

        recognition.onend = () => {
            setIsLiveRecording(false);
        };
        
        recognitionRef.current = recognition;
        setIsSupported(true);
    } else {
        setIsSupported(false);
    }

    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };
}, [toast]);
  
  const handleToggleLiveRecording = () => {
    if (!recognitionRef.current) return;

    if (isLiveRecording) {
      recognitionRef.current.stop();
      setIsLiveRecording(false);
    } else {
      setTranscript('');
      setAnalysisResult(null);
      recognitionRef.current.start();
      setIsLiveRecording(true);
    }
  };
  
   const handleToggleAudioRecording = async () => {
    if (isAudioRecording) {
      mediaRecorderRef.current?.stop();
      setIsAudioRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(audioBlob);
          setAudioUrl(audioUrl);
          setAudioBlob(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };
        
        setAudioUrl(null);
        setAudioBlob(null);
        setAudioFile(null);
        setAnalysisResult(null);
        setTranscript('');
        mediaRecorderRef.current.start();
        setIsAudioRecording(true);

      } catch (err) {
        console.error("Error accessing microphone:", err);
        toast({
          variant: "destructive",
          title: "Microphone Access Denied",
          description: "Please allow microphone access to record audio.",
        });
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setAudioFile(file);
        const url = URL.createObjectURL(file);
        setAudioUrl(url);
        setAudioBlob(null);
        setTranscript('');
        setAnalysisResult(null);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please select a valid audio file.",
        });
      }
    }
  };

  const handleAnalyze = async () => {
    if (analysisMode === 'interview' && !question.trim()) {
        toast({ title: "Question is empty.", description: "Please provide the question for interview mode." });
        return;
    }
    if (analysisMode === 'practice') {
      if (!question.trim()) {
        toast({ title: "Question is empty.", description: "Please provide the question for practice mode." });
        return;
      }
      if (!perfectAnswer.trim()) {
        toast({ title: "Perfect Answer is empty.", description: "Please provide the perfect answer for practice mode." });
        return;
      }
    }

    let inputData: any = {
      mode: analysisMode,
      question: (analysisMode === 'interview' || analysisMode === 'practice') ? question : undefined,
      perfectAnswer: analysisMode === 'practice' ? perfectAnswer : undefined,
    };
    
    let audioSource: Blob | File | null = null;
    if (inputMode === 'live') {
      if (!transcript.trim()) {
        toast({ title: "Your speech is empty.", description: "Please record your speech before analyzing." });
        return;
      }
      inputData.transcription = transcript;
    } else if (inputMode === 'audio') {
      audioSource = audioBlob;
      if (!audioSource) {
        toast({ title: "No audio recorded.", description: "Please record an audio file before analyzing." });
        return;
      }
    } else if (inputMode === 'upload') {
        audioSource = audioFile;
        if (!audioSource) {
            toast({ title: "No file selected.", description: "Please select an audio file before analyzing." });
            return;
        }
    }

    if (audioSource) {
      const reader = new FileReader();
      reader.readAsDataURL(audioSource);
      await new Promise<void>((resolve, reject) => {
        reader.onloadend = () => {
          inputData.audioDataUri = reader.result as string;
          resolve();
        };
        reader.onerror = reject;
      });
    }


    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await analyze(inputData);
      setAnalysisResult(result);
      if (result.transcription && !transcript) {
        setTranscript(result.transcription);
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message || "Could not analyze the speech. Please try again.",
      });
      setAnalysisResult(null);
    } finally {
        setIsAnalyzing(false);
    }
  };
  
  const handleDownloadPdf = () => {
    if (!analysisResult) {
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: "No analysis result to download.",
        });
        return;
    }

    toast({
        title: "Preparing PDF",
        description: "Your report is being generated, please wait...",
    });

    const doc = new jsPDF();
    let y = 15; // Vertical position in PDF

    const addText = (text: string, size: number, style: 'bold' | 'normal', indent = 10) => {
        if (y > 280) { // New page if content overflows
            doc.addPage();
            y = 15;
        }
        doc.setFontSize(size);
        doc.setFont('helvetica', style);
        const lines = doc.splitTextToSize(text, 180); // Wrap text
        doc.text(lines, indent, y);
        y += (lines.length * size * 0.4); // Increment y position
    };

    const addCriterion = (title: string, criterion: EvaluationCriterion) => {
        addText(`${title}: ${criterion.score} / 10`, 12, 'bold');
        addText(`Evaluation: ${criterion.evaluation}`, 10, 'normal', 15);
        addText(`Feedback: ${criterion.feedback}`, 10, 'normal', 15);
        y += 5;
    };
    
    // Title
    addText('Speech Analysis Report', 18, 'bold');
    y += 10;
    
    // Overall Assessment
    if (analysisResult.totalScore) {
      addText('Overall Assessment', 14, 'bold');
      addCriterion('Total Score', analysisResult.totalScore);
    }

    // Transcription
    if (transcript) {
      addText('Transcription', 14, 'bold');
      addText(`"${transcript}"`, 10, 'normal');
      y += 5;
    }
    
    // Metadata
    addText('Speech Metrics', 14, 'bold');
    addText(`Word Count: ${analysisResult.wordCount}`, 10, 'normal');
    addText(`Filler Words: ${analysisResult.fillerWordCount}`, 10, 'normal');
    addText(`Speech Rate: ${analysisResult.speechRateWPM} WPM`, 10, 'normal');
    addText(`Avg. Pause Duration: ${analysisResult.averagePauseDurationMs}ms`, 10, 'normal');
    addText(`Pitch Variance: ${analysisResult.pitchVariance.toFixed(2)}`, 10, 'normal');
    addText(`Audio Duration: ${analysisResult.audioDurationSeconds.toFixed(1)}s`, 10, 'normal');
    y += 5;

    // Detailed Criteria
    analysisCriteriaGroups.forEach(group => {
        addText(group.label, 14, 'bold');
        const category = analysisResult[group.groupKey as keyof AnalyzeSpeechOutput] as any;
        if (category) {
            group.criteria.forEach(criterionInfo => {
                const criterion = category[criterionInfo.key] as EvaluationCriterion | undefined;
                if (criterion) {
                    addCriterion(criterionInfo.label, criterion);
                }
            });
        }
    });

    doc.save('speech-analysis-report.pdf');
  };

  const analysisCriteriaGroups = [
      {
        groupKey: 'delivery', 
        label: 'Delivery', 
        icon: <Waves className="h-5 w-5" />,
        criteria: [
            {key: 'fluency', label: 'Fluency'},
            {key: 'pacing', label: 'Pacing'},
            {key: 'clarity', label: 'Clarity'},
            {key: 'confidence', label: 'Confidence'},
            {key: 'emotionalTone', label: 'Emotional Tone'},
        ]
      },
      {
        groupKey: 'language', 
        label: 'Language', 
        icon: <Languages className="h-5 w-5" />,
        criteria: [
            {key: 'grammar', label: 'Grammar'},
            {key: 'vocabulary', label: 'Vocabulary'},
            {key: 'wordChoice', label: 'Word Choice'},
            {key: 'conciseness', label: 'Conciseness'},
            {key: 'fillerWords', label: 'Filler Words'}
        ]
    },
      {
        groupKey: 'content', 
        label: 'Content', 
        icon: <BookCopy className="h-5 w-5" />,
        criteria: [
            {key: 'relevance', label: 'Relevance'},
            {key: 'organization', label: 'Organization'},
            {key: 'accuracy', label: 'Accuracy'},
            {key: 'depth', label: 'Depth'},
            {key: 'persuasiveness', label: 'Persuasiveness'}
        ]
    },
  ];

  const CriterionDisplay = ({ criterion }: { criterion: EvaluationCriterion }) => (
    <div className="space-y-4 text-sm mt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-primary mb-1">Score</h4>
        <span className="font-bold text-lg text-primary">{criterion.score} / 10</span>
      </div>
       <div className="w-full bg-muted rounded-full h-2.5">
          <div className="bg-primary h-2.5 rounded-full" style={{ width: `${criterion.score * 10}%` }}></div>
       </div>
      <div>
        <h4 className="font-semibold text-primary mb-1">Evaluation</h4>
        <p className="text-foreground/80">{criterion.evaluation}</p>
      </div>
      <div>
        <h4 className="font-semibold text-primary mb-1">Feedback for Improvement</h4>
        <p className="text-foreground/80">{criterion.feedback}</p>
      </div>
    </div>
  );
  
  const AnalysisPlaceholder = () => (
    <div className="flex flex-col items-center justify-center rounded-lg h-full text-center bg-secondary p-8">
      <BrainCircuit className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <p className="text-lg font-medium">Your analysis dashboard will appear here.</p>
      <p className="text-muted-foreground">Record your speech and click "Analyze" to get started.</p>
    </div>
  );
  
  const AnalysisLoading = () => (
     <div className="flex flex-col items-center justify-center rounded-lg h-full text-center bg-secondary p-8">
      <LoaderCircle className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg font-medium">Analyzing your speech...</p>
      <p className="text-muted-foreground">This may take a moment. The AI is generating feedback.</p>
    </div>
  );
  
  type AnalysisMode = 'interview' | 'presentation' | 'practice';
  type InputMode = 'live' | 'audio' | 'upload';

  const resetStateForMode = (mode: InputMode) => {
    setInputMode(mode);
    setAudioUrl(null);
    setAudioBlob(null);
    setAudioFile(null);
    setTranscript('');
    setAnalysisResult(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-16 text-center">
            <div className="flex justify-center items-center gap-4 mb-2">
                <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
                    🎙️ Speech Analysis Assistant
                </h1>
                <ThemeToggle />
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
                Record or transcribe your speech to get AI-powered feedback on your delivery, language, and content.
            </p>
        </header>

        <div className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-screen-xl mx-auto">
            <Step number={1} title="Provide Your Speech">
              <Card className="w-full shadow-lg bg-card/50 overflow-x-hidden">
                  <Tabs value={inputMode} onValueChange={(v) => resetStateForMode(v as InputMode)}>
                    <CardHeader className="p-4 border-b">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="live" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Mic className="mr-2"/>Live</TabsTrigger>
                            <TabsTrigger value="audio" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><AudioLines className="mr-2"/>Record</TabsTrigger>
                            <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Upload className="mr-2"/>Upload</TabsTrigger>
                        </TabsList>
                    </CardHeader>
                    <TabsContent value="live">
                        <CardContent className="p-4">
                          <Textarea
                            placeholder={isLiveRecording ? "Listening..." : "Your transcribed speech will appear here..."}
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            readOnly={isLiveRecording}
                            className="h-48 resize-none bg-secondary/50 border-dashed"
                          />
                        </CardContent>
                         <CardFooter className="p-4 bg-muted/50">
                           <Button 
                            onClick={handleToggleLiveRecording} 
                            disabled={!isSupported || isAnalyzing || isAudioRecording}
                            className="w-full"
                            size="lg"
                            variant={isLiveRecording ? "destructive" : "default"}
                          >
                            {isLiveRecording 
                              ? <StopCircle className="mr-2 h-5 w-5" /> 
                              : <Mic className="mr-2 h-5 w-5" />
                            }
                            {isLiveRecording ? 'Stop' : 'Start Live Transcription'}
                          </Button>
                        </CardFooter>
                    </TabsContent>
                    <TabsContent value="audio">
                         <CardContent className="p-4 flex flex-col items-center justify-center space-y-4 min-h-[12rem]">
                            {audioUrl && (inputMode === 'audio' && !isAudioRecording) ? (
                                <div className="w-full space-y-4">
                                    <audio controls src={audioUrl} className="w-full"></audio>
                                    <Button asChild variant="outline" className="w-full">
                                        <a href={audioUrl} download="recording.wav">
                                            <Download className="mr-2" />
                                            Download Recording
                                        </a>
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    {isAudioRecording ? "Recording in progress..." : "Your recorded audio will appear here."}
                                </div>
                            )}
                        </CardContent>
                         <CardFooter className="p-4 bg-muted/50">
                           <Button 
                            onClick={handleToggleAudioRecording} 
                            disabled={isAnalyzing || isLiveRecording}
                            className="w-full"
                            size="lg"
                            variant={isAudioRecording ? "destructive" : "default"}
                          >
                            {isAudioRecording 
                              ? <StopCircle className="mr-2 h-5 w-5" /> 
                              : <AudioLines className="mr-2 h-5 w-5" />
                            }
                            {isAudioRecording ? 'Stop Recording' : 'Start Audio Recording'}
                          </Button>
                        </CardFooter>
                    </TabsContent>
                     <TabsContent value="upload">
                          <CardContent className="p-4 flex flex-col items-center justify-center space-y-4 min-h-[12rem]">
                              {audioFile && audioUrl && inputMode === 'upload' ? (
                                  <div className="w-full space-y-4 text-center">
                                      <p className="text-sm font-medium text-muted-foreground">
                                          Selected: <span className="font-bold text-primary">{audioFile.name}</span>
                                      </p>
                                      <audio controls src={audioUrl} className="w-full"></audio>
                                  </div>
                              ) : (
                                  <div 
                                      className="w-full h-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors"
                                      onClick={() => fileInputRef.current?.click()}
                                  >
                                      <Upload className="h-10 w-10 text-muted-foreground/50 mb-2" />
                                      <p className="text-muted-foreground">Drop an audio file here or click to select.</p>
                                  </div>
                              )}
                          </CardContent>
                          <CardFooter className="p-4 bg-muted/50">
                              <input
                                  type="file"
                                  ref={fileInputRef}
                                  onChange={handleFileSelect}
                                  accept="audio/*"
                                  className="hidden"
                              />
                              <Button
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={isAnalyzing || isLiveRecording || isAudioRecording}
                                  className="w-full"
                                  size="lg"
                                  variant="outline"
                              >
                                  <Upload className="mr-2 h-5 w-5" />
                                  {audioFile ? 'Change File' : 'Select Audio File'}
                              </Button>
                          </CardFooter>
                      </TabsContent>
                  </Tabs>
              </Card>
            </Step>
            
            <Step number={2} title="Set Analysis Context">
               <Card className="w-full shadow-lg bg-card/50">
                <CardContent className="p-6 space-y-6">
                    <RadioGroup value={analysisMode} onValueChange={(value) => setAnalysisMode(value as AnalysisMode)} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <RadioGroupItem value="presentation" id="r1" className="sr-only peer" />
                            <Label 
                                htmlFor="r1" 
                                className={cn(
                                    "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                    analysisMode === 'presentation' && "bg-primary text-primary-foreground border-primary"
                                )}
                            >
                                <Presentation className="mb-3 h-6 w-6" />
                                Presentation
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="interview" id="r2" className="sr-only peer" />
                             <Label 
                                htmlFor="r2" 
                                className={cn(
                                    "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                    analysisMode === 'interview' && "bg-primary text-primary-foreground border-primary"
                                )}
                            >
                                <MessageSquareQuote className="mb-3 h-6 w-6" />
                                Interview
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="practice" id="r3" className="sr-only peer" />
                             <Label 
                                htmlFor="r3" 
                                className={cn(
                                    "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                    analysisMode === 'practice' && "bg-primary text-primary-foreground border-primary"
                                )}
                            >
                                <ClipboardCheck className="mb-3 h-6 w-6" />
                                Practice
                            </Label>
                        </div>
                    </RadioGroup>

                    {(analysisMode === 'interview' || analysisMode === 'practice') && (
                        <div className="space-y-2">
                            <Label htmlFor="question">Interview Question</Label>
                            <Input 
                                id="question" 
                                placeholder="e.g., 'Tell me about yourself.'" 
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                className="bg-secondary/50 border-dashed"
                            />
                        </div>
                    )}
                    {analysisMode === 'practice' && (
                        <div className="space-y-2">
                            <Label htmlFor="perfectAnswer">Perfect Answer</Label>
                            <Textarea 
                                id="perfectAnswer" 
                                placeholder="Enter the ideal answer to the question..." 
                                value={perfectAnswer}
                                onChange={(e) => setPerfectAnswer(e.target.value)}
                                className="bg-secondary/50 border-dashed h-32"
                            />
                        </div>
                    )}
                     {analysisMode === 'presentation' && (
                        <div className="text-sm text-center text-muted-foreground p-4 bg-secondary/30 rounded-md h-full flex items-center justify-center">
                            <p>In Presentation Mode, your speech will be evaluated for general clarity, structure, and engagement.</p>
                        </div>
                    )}
                </CardContent>
              </Card>
            </Step>
          </div>
          
          <div className="text-center pt-4">
              <Button onClick={handleAnalyze} disabled={isAnalyzing || isLiveRecording || isAudioRecording} size="lg" className="w-full max-w-md">
                {isAnalyzing ? (
                  <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <BrainCircuit className="mr-2 h-5 w-5" />
                )}
                {isAnalyzing ? 'Analyzing...' : 'Analyze My Speech'}
              </Button>
          </div>
          
           <section className="space-y-6 pt-12 max-w-7xl mx-auto">
            {isAnalyzing 
              ? <AnalysisLoading /> 
              : analysisResult ? (
                <div ref={dashboardRef} className="space-y-8 bg-background p-4 sm:p-6 rounded-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-3xl font-headline text-center sm:text-left">Analysis Dashboard</h2>
                    <Button onClick={handleDownloadPdf} variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Download Report
                    </Button>
                  </div>
                  
                  {analysisResult.totalScore && (
                     <Card className="bg-primary/10 border-primary/20">
                      <CardHeader>
                          <CardTitle className="flex items-center gap-3 text-xl text-primary">
                            <BotMessageSquare />
                            Overall Assessment
                          </CardTitle>
                      </CardHeader>
                      <CardContent>
                          <CriterionDisplay criterion={analysisResult.totalScore} />
                      </CardContent>
                    </Card>
                  )}

                  {transcript && (
                      <Card>
                        <CardHeader>
                            <CardTitle>Transcription</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground italic">"{transcript}"</p>
                        </CardContent>
                      </Card>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="bg-card/50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Word Count</CardTitle>
                        <BookOpenText className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{analysisResult.wordCount}</div>
                        <p className="text-xs text-muted-foreground">Total words spoken</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Filler Words</CardTitle>
                        <MessageCircleWarning className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{analysisResult.fillerWordCount}</div>
                        <p className="text-xs text-muted-foreground">e.g., um, ah, like</p>
                      </CardContent>
                    </Card>
                     <Card className="bg-card/50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Speech Rate (WPM)</CardTitle>
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{analysisResult.speechRateWPM}</div>
                        <p className="text-xs text-muted-foreground">Words per minute</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Pause Duration</CardTitle>
                        <Hourglass className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{analysisResult.averagePauseDurationMs}ms</div>
                        <p className="text-xs text-muted-foreground">Indicates speech fluency</p>
                      </CardContent>
                    </Card>
                     <Card className="bg-card/50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pitch Variance</CardTitle>
                        <BarChart4 className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{analysisResult.pitchVariance.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Measures vocal expressiveness</p>
                      </CardContent>
                    </Card>
                     <Card className="bg-card/50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Audio Duration</CardTitle>
                        <FileClock className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{analysisResult.audioDurationSeconds.toFixed(1)}s</div>
                        <p className="text-xs text-muted-foreground">Total recording time</p>
                      </CardContent>
                    </Card>
                  </div>

                    <div className="space-y-6">
                      {analysisCriteriaGroups.map((group) => (
                        <Card key={group.groupKey} className="bg-background/70">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-xl">
                              <div className="text-primary">{group.icon}</div>
                              {group.label}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                              {group.criteria.map((criterionInfo) => {
                                 const category = analysisResult[group.groupKey as keyof AnalyzeSpeechOutput] as any;
                                 if (!category) return null;
                                 const criterion = category[criterionInfo.key] as EvaluationCriterion | undefined;
                                 if (!criterion) return null;

                                 return (
                                    <Card key={criterionInfo.key} className="w-full bg-card">
                                       <CardHeader>
                                          <CardTitle className="text-lg font-medium">{criterionInfo.label}</CardTitle>
                                       </CardHeader>
                                       <CardContent>
                                          <CriterionDisplay criterion={criterion} />
                                       </CardContent>
                                    </Card>
                                 )
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                </div>
              ) : (
                <AnalysisPlaceholder />
              )}
           </section>
        </div>
      </main>
    </div>
  );
}
