/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { RestAPI } from "@webpack/common";

interface StatusFrame {
    text: string;
    emoji_name: string;
    emoji_id: string;
    timeout: number;
}

const logger = new Logger("AnimatedStatus");
const MIN_TIMEOUT = 2900;

const settings = definePluginSettings({
    timeout: {
        type: OptionType.NUMBER,
        description: "Default duration for each status frame in milliseconds (minimum 2900ms)",
        default: 3000,
        onChange: (value: number) => {
            if (value < MIN_TIMEOUT) {
                settings.store.timeout = MIN_TIMEOUT;
            }
        }
    },
    randomize: {
        type: OptionType.BOOLEAN,
        description: "Randomize the order of status frames",
        default: false
    },
    animation: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => <AnimationEditor />
    }
});

let animationLoop: NodeJS.Timeout | null = null;
let shouldStop = false;

function evaluateField(field: string): string {
    if (!field) return "";
    
    // Check if field starts with "eval "
    if (field.trim().startsWith("eval ")) {
        try {
            const code = field.trim().substring(5).trim();
            // eslint-disable-next-line no-eval
            const result = eval(code);
            return String(result || "");
        } catch (error) {
            logger.error("Failed to evaluate field:", error);
            return "";
        }
    }
    
    return field;
}

async function setStatus(status: Partial<StatusFrame> | null) {
    const customStatus: any = {};
    
    if (status) {
        if (status.text) customStatus.text = status.text;
        if (status.emoji_name) customStatus.emoji_name = status.emoji_name;
        if (status.emoji_id) customStatus.emoji_id = status.emoji_id;
    }

    try {
        await RestAPI.patch({
            url: "/users/@me/settings",
            body: {
                custom_status: Object.keys(customStatus).length > 0 ? customStatus : null
            }
        });
    } catch (error) {
        logger.error("Failed to set status:", error);
    }
}

async function startAnimation() {
    const animation = await DataStore.get("animatedStatus_animation") || [];
    
    if (animation.length === 0) {
        logger.info("No status animation configured");
        return;
    }

    shouldStop = false;
    let currentIndex = 0;

    const animate = async () => {
        if (shouldStop) return;

        const frames = settings.store.randomize 
            ? [...animation].sort(() => Math.random() - 0.5)
            : animation;

        const frame = frames[currentIndex % frames.length];
        
        if (frame) {
            await setStatus({
                text: evaluateField(frame.text) || "",
                emoji_name: evaluateField(frame.emoji_name) || "",
                emoji_id: frame.emoji_id || ""
            });

            const timeout = frame.timeout || settings.store.timeout || 3000;
            animationLoop = setTimeout(() => {
                currentIndex++;
                animate();
            }, Math.max(timeout, MIN_TIMEOUT));
        }
    };

    animate();
}

function stopAnimation() {
    shouldStop = true;
    if (animationLoop) {
        clearTimeout(animationLoop);
        animationLoop = null;
    }
    setStatus(null);
}

// Animation Editor Component
import { Button, Forms, React, TextInput, useState } from "@webpack/common";
import { Flex } from "@components/Flex";

function AnimationEditor() {
    const [frames, setFrames] = useState<StatusFrame[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    React.useEffect(() => {
        DataStore.get("animatedStatus_animation").then((data: StatusFrame[] | undefined) => {
            setFrames(data || []);
            setIsLoading(false);
        });
    }, []);

    const addFrame = () => {
        setFrames([...frames, { text: "", emoji_name: "", emoji_id: "", timeout: settings.store.timeout }]);
    };

    const removeFrame = (index: number) => {
        setFrames(frames.filter((_, i) => i !== index));
    };

    const updateFrame = (index: number, field: keyof StatusFrame, value: string | number) => {
        const newFrames = [...frames];
        newFrames[index] = { ...newFrames[index], [field]: value };
        setFrames(newFrames);
    };

    const moveFrame = (index: number, direction: "up" | "down") => {
        if (
            (direction === "up" && index === 0) ||
            (direction === "down" && index === frames.length - 1)
        ) return;

        const newFrames = [...frames];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        [newFrames[index], newFrames[targetIndex]] = [newFrames[targetIndex], newFrames[index]];
        setFrames(newFrames);
    };

    const saveFrames = async () => {
        try {
            await DataStore.set("animatedStatus_animation", frames);
            logger.info("Animation saved successfully");
            
            // Restart animation if plugin is enabled
            stopAnimation();
            startAnimation();
        } catch (error) {
            logger.error("Failed to save animation:", error);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div style={{ padding: "10px" }}>
            <Forms.FormTitle>Status Animation Frames</Forms.FormTitle>
            <Forms.FormText style={{ marginBottom: "10px" }}>
                Configure your animated status frames. Each frame can have text, an emoji name, and an optional custom emoji ID (for Nitro users).
                <br /><br />
                <strong>💡 Advanced:</strong> Use <code>eval</code> prefix for dynamic JavaScript content (e.g., <code>eval new Date().toLocaleTimeString()</code>)
            </Forms.FormText>

            {frames.map((frame, index) => (
                <div key={index} style={{
                    border: "1px solid var(--background-modifier-accent)",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "12px",
                    backgroundColor: "var(--background-secondary)"
                }}>
                    <Flex style={{ gap: "8px", marginBottom: "8px" }}>
                        <div style={{ flex: 1 }}>
                            <Forms.FormTitle tag="h5">Status Text</Forms.FormTitle>
                            <TextInput
                                value={frame.text}
                                onChange={(value: string) => updateFrame(index, "text", value)}
                                placeholder="Status text (or 'eval ...' for dynamic content)"
                            />
                        </div>
                    </Flex>

                    <Flex style={{ gap: "8px", marginBottom: "8px" }}>
                        <div style={{ flex: 1 }}>
                            <Forms.FormTitle tag="h5">Emoji Name</Forms.FormTitle>
                            <TextInput
                                value={frame.emoji_name}
                                onChange={(value: string) => updateFrame(index, "emoji_name", value)}
                                placeholder="😀 or emoji_name (or 'eval ...')"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <Forms.FormTitle tag="h5">Emoji ID (Nitro)</Forms.FormTitle>
                            <TextInput
                                value={frame.emoji_id}
                                onChange={(value: string) => updateFrame(index, "emoji_id", value)}
                                placeholder="Custom emoji ID"
                            />
                        </div>
                        <div style={{ width: "120px" }}>
                            <Forms.FormTitle tag="h5">Duration (ms)</Forms.FormTitle>
                            <TextInput
                                type="number"
                                value={frame.timeout.toString()}
                                onChange={(value: string) => updateFrame(index, "timeout", parseInt(value) || MIN_TIMEOUT)}
                                placeholder="3000"
                            />
                        </div>
                    </Flex>

                    <Flex style={{ gap: "8px" }}>
                        <Button
                            size={Button.Sizes.SMALL}
                            onClick={() => moveFrame(index, "up")}
                            disabled={index === 0}
                        >
                            ↑
                        </Button>
                        <Button
                            size={Button.Sizes.SMALL}
                            onClick={() => moveFrame(index, "down")}
                            disabled={index === frames.length - 1}
                        >
                            ↓
                        </Button>
                        <Button
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.RED}
                            onClick={() => removeFrame(index)}
                        >
                            Remove
                        </Button>
                    </Flex>
                </div>
            ))}

            <Flex style={{ gap: "8px", marginTop: "12px" }}>
                <Button onClick={addFrame}>
                    Add Frame
                </Button>
                <Button
                    color={Button.Colors.GREEN}
                    onClick={saveFrames}
                >
                    Save Animation
                </Button>
            </Flex>
        </div>
    );
}

export default definePlugin({
    name: "AnimatedStatus",
    description: "Animate your Discord custom status with rotating text and emojis",
    authors: [{
        name: "Quang Blue",
        id: 439262471765884939n
    }],
    settings,

    start() {
        startAnimation();
    },

    stop() {
        stopAnimation();
    }
});
