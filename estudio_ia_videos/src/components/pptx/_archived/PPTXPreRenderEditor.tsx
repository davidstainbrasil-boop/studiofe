
import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { UniversalSlideComposition } from '../../app/remotion/UniversalSlide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { UniversalPresentationData, UniversalSlide } from '@/lib/pptx/parsers/element-parser';

interface PPTXPreRenderEditorProps {
    presentation: UniversalPresentationData;
    onSave: (slides: UniversalSlide[]) => void;
    onRender: (slides: UniversalSlide[]) => void;
}

export default function PPTXPreRenderEditor({ presentation, onSave, onRender }: PPTXPreRenderEditorProps) {
    const [slides, setSlides] = useState<UniversalSlide[]>(presentation.slides);
    const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
    const [isDirty, setIsDirty] = useState(false);

    const selectedSlide = slides[selectedSlideIndex];

    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDuration = parseFloat(e.target.value);
        if (isNaN(newDuration) || newDuration < 0.1) return;

        const newSlides = [...slides];
        newSlides[selectedSlideIndex] = {
            ...selectedSlide,
            duration: newDuration
        };
        setSlides(newSlides);
        setIsDirty(true);
    };

    const handleSave = () => {
        onSave(slides);
        setIsDirty(false);
    };

    const handleRender = () => {
        onRender(slides);
    };

    return (
        <div className="flex h-full gap-4 p-4">
            {/* Slide List */}
            <Card className="w-1/4 h-full flex flex-col">
                <CardHeader>
                    <CardTitle>Slides</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full">
                        <div className="flex flex-col gap-2 p-2">
                            {slides.map((slide, index) => (
                                <div
                                    key={index}
                                    onClick={() => setSelectedSlideIndex(index)}
                                    className={`p-3 border rounded cursor-pointer hover:bg-accent ${selectedSlideIndex === index ? 'bg-accent border-primary' : ''
                                        }`}
                                >
                                    <div className="font-bold">Slide {slide.slideNumber}</div>
                                    <div className="text-xs text-muted-foreground">{slide.duration}s</div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Editor & Preview */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Preview */}
                <Card className="flex-1 min-h-[400px] flex items-center justify-center bg-black/5">
                    {selectedSlide && (
                        <div className="w-full h-full flex items-center justify-center p-4">
                            <Player
                                component={UniversalSlideComposition}
                                inputProps={{ slide: selectedSlide }}
                                durationInFrames={Math.ceil(selectedSlide.duration * 30)}
                                fps={30}
                                compositionWidth={1920}
                                compositionHeight={1080}
                                style={{
                                    width: '100%',
                                    aspectRatio: '16/9',
                                }}
                                controls
                            />
                        </div>
                    )}
                </Card>

                {/* Properties Panel */}
                <Card className="h-1/3">
                    <Tabs defaultValue="timing" className="h-full flex flex-col">
                        <div className="p-4 border-b">
                            <TabsList>
                                <TabsTrigger value="timing">Timing</TabsTrigger>
                                <TabsTrigger value="content">Content</TabsTrigger>
                                <TabsTrigger value="animation">Animations</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 p-4 overflow-auto">
                            <TabsContent value="timing" className="mt-0 space-y-4">
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="duration">Duration (seconds)</Label>
                                    <Input
                                        type="number"
                                        id="duration"
                                        value={selectedSlide?.duration || 5}
                                        onChange={handleDurationChange}
                                        step={0.1}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="content" className="mt-0">
                                <p className="text-muted-foreground">Content editing coming soon.</p>
                            </TabsContent>

                            <TabsContent value="animation" className="mt-0">
                                <div className="space-y-2">
                                    <h3 className="font-medium mb-2">Slide Animations:</h3>
                                    {selectedSlide?.elements.filter(el => el.animations?.length).map(el => (
                                        <div key={el.id} className="text-sm p-2 border rounded">
                                            {el.name}: {el.animations?.map(a => a.type).join(', ')}
                                        </div>
                                    ))}
                                    {selectedSlide?.elements.filter(el => el.animations?.length).length === 0 && (
                                        <p className="text-sm text-muted-foreground">No animations on this slide</p>
                                    )}
                                </div>
                            </TabsContent>
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t flex justify-between items-center bg-muted/20">
                            <div className="text-sm text-muted-foreground">
                                {isDirty ? 'Unsaved changes' : 'All changes saved'}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleSave}>Save</Button>
                                <Button onClick={handleRender}>Render Video</Button>
                            </div>
                        </div>
                    </Tabs>
                </Card>
            </div>
        </div>
    );
}
