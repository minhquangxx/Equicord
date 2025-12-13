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

import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps, findStoreLazy, wreq } from "@webpack";
import { FluxDispatcher, RestAPI, showToast, Toasts } from "@webpack/common";

const logger = new Logger("AutoCompleteQuest");

const settings = definePluginSettings({
    autoStart: {
        type: OptionType.BOOLEAN,
        description: "Automatically start quest completion when available, if turn off this you can use /completequest command after getting a new quest",
        default: false,
        onChange: (value: boolean) => {
            if (value) {
                logger.info("Auto-start enabled, checking for quests...");
                setTimeout(() => completeQuest(), 2000);
            }
        }
    },
    checkInterval: {
        type: OptionType.NUMBER,
        description: "Check for new quests every X minutes (0 to disable periodic checks)",
        default: 5,
        onChange: (value: number) => {
            restartIntervalCheck();
        }
    }
});

let isProcessing = false;
let checkIntervalId: NodeJS.Timeout | null = null;

async function completeQuest() {
    if (isProcessing) {
        showToast("Quest completion already in progress!", Toasts.Type.FAILURE);
        return;
    }

    try {
        isProcessing = true;

        // Get webpack modules
        let wpRequire;
        try {
            wpRequire = wreq;
        } catch {
            showToast("Failed to access webpack modules!", Toasts.Type.FAILURE);
            isProcessing = false;
            return;
        }

        // Find required stores
        const ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata)?.exports?.Z;
        const RunningGameStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getRunningGames)?.exports?.ZP;
        const QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getQuest)?.exports?.Z;
        const ChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getAllThreadsForParent)?.exports?.Z;
        const GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getSFWDefaultChannel)?.exports?.ZP;

        if (!QuestsStore) {
            showToast("Failed to find QuestsStore!", Toasts.Type.FAILURE);
            isProcessing = false;
            return;
        }

        // Find active quest
        const quest = [...QuestsStore.quests.values()].find(x =>
            x.id !== "1412491570820812933" &&
            x.userStatus?.enrolledAt &&
            !x.userStatus?.completedAt &&
            new Date(x.config.expiresAt).getTime() > Date.now()
        );

        const isApp = typeof DiscordNative !== "undefined";

        if (!quest) {
            showToast("No uncompleted quests found!", Toasts.Type.MESSAGE);
            isProcessing = false;
            return;
        }

        const pid = Math.floor(Math.random() * 30000) + 1000;
        const applicationId = quest.config.application.id;
        const applicationName = quest.config.application.name;
        const questName = quest.config.messages.questName;
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"].find(x => taskConfig.tasks[x] != null);
        const secondsNeeded = taskConfig.tasks[taskName].target;
        let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;

        logger.info(`Starting quest: ${questName} (${taskName})`);

        if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
            const maxFuture = 10, speed = 7, interval = 1;
            const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
            let completed = false;

            showToast(`Spoofing video for ${questName}...`, Toasts.Type.MESSAGE);

            const processVideo = async () => {
                while (true) {
                    const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
                    const diff = maxAllowed - secondsDone;
                    const timestamp = secondsDone + speed;

                    if (diff >= speed) {
                        const res = await RestAPI.post({
                            url: `/quests/${quest.id}/video-progress`,
                            body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) }
                        });
                        completed = res.body.completed_at != null;
                        secondsDone = Math.min(secondsNeeded, timestamp);
                        logger.info(`Quest progress: ${secondsDone}/${secondsNeeded}`);
                    }

                    if (timestamp >= secondsNeeded) {
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, interval * 1000));
                }

                if (!completed) {
                    await RestAPI.post({
                        url: `/quests/${quest.id}/video-progress`,
                        body: { timestamp: secondsNeeded }
                    });
                }

                showToast("Quest completed!", Toasts.Type.SUCCESS);
                logger.info("Quest completed!");
                isProcessing = false;
            };

            processVideo();
        } else if (taskName === "PLAY_ON_DESKTOP") {
            if (!isApp) {
                showToast("This only works in Discord desktop app!", Toasts.Type.FAILURE);
                isProcessing = false;
                return;
            }

            const res = await RestAPI.get({ url: `/applications/public?application_ids=${applicationId}` });
            const appData = res.body[0];
            const exeName = appData.executables.find(x => x.os === "win32").name.replace(">", "");

            const fakeGame = {
                cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
                exeName,
                exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
                hidden: false,
                isLauncher: false,
                id: applicationId,
                name: appData.name,
                pid: pid,
                pidPath: [pid],
                processName: appData.name,
                start: Date.now(),
            };

            const realGames = RunningGameStore.getRunningGames();
            const fakeGames = [fakeGame];
            const realGetRunningGames = RunningGameStore.getRunningGames;
            const realGetGameForPID = RunningGameStore.getGameForPID;

            RunningGameStore.getRunningGames = () => fakeGames;
            RunningGameStore.getGameForPID = (pid) => fakeGames.find(x => x.pid === pid);
            FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames });

            const progressHandler = data => {
                let progress = quest.config.configVersion === 1
                    ? data.userStatus.streamProgressSeconds
                    : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
                logger.info(`Quest progress: ${progress}/${secondsNeeded}`);

                if (progress >= secondsNeeded) {
                    showToast("Quest completed!", Toasts.Type.SUCCESS);
                    logger.info("Quest completed!");

                    RunningGameStore.getRunningGames = realGetRunningGames;
                    RunningGameStore.getGameForPID = realGetGameForPID;
                    FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", progressHandler);
                    isProcessing = false;
                }
            };

            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", progressHandler);
            showToast(`Spoofed game to ${applicationName}. Wait ${Math.ceil((secondsNeeded - secondsDone) / 60)} minutes.`, Toasts.Type.MESSAGE);
        } else if (taskName === "STREAM_ON_DESKTOP") {
            if (!isApp) {
                showToast("This only works in Discord desktop app!", Toasts.Type.FAILURE);
                isProcessing = false;
                return;
            }

            const realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
            ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
                id: applicationId,
                pid,
                sourceName: null
            });

            const progressHandler = data => {
                let progress = quest.config.configVersion === 1
                    ? data.userStatus.streamProgressSeconds
                    : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
                logger.info(`Quest progress: ${progress}/${secondsNeeded}`);

                if (progress >= secondsNeeded) {
                    showToast("Quest completed!", Toasts.Type.SUCCESS);
                    logger.info("Quest completed!");

                    ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", progressHandler);
                    isProcessing = false;
                }
            };

            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", progressHandler);
            showToast(`Spoofed stream to ${applicationName}. Stream any window in VC for ${Math.ceil((secondsNeeded - secondsDone) / 60)} minutes.`, Toasts.Type.MESSAGE);
            logger.info("Remember that you need at least 1 other person to be in the vc!");
        } else if (taskName === "PLAY_ACTIVITY") {
            const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id ??
                Object.values(GuildChannelStore.getAllGuilds()).find(x => x != null && x.VOCAL.length > 0).VOCAL[0].channel.id;
            const streamKey = `call:${channelId}:1`;

            showToast(`Completing quest: ${questName}`, Toasts.Type.MESSAGE);

            const processActivity = async () => {
                while (true) {
                    const res = await RestAPI.post({
                        url: `/quests/${quest.id}/heartbeat`,
                        body: { stream_key: streamKey, terminal: false }
                    });
                    const progress = res.body.progress.PLAY_ACTIVITY.value;
                    logger.info(`Quest progress: ${progress}/${secondsNeeded}`);

                    await new Promise(resolve => setTimeout(resolve, 20 * 1000));

                    if (progress >= secondsNeeded) {
                        await RestAPI.post({
                            url: `/quests/${quest.id}/heartbeat`,
                            body: { stream_key: streamKey, terminal: true }
                        });
                        break;
                    }
                }

                showToast("Quest completed!", Toasts.Type.SUCCESS);
                logger.info("Quest completed!");
                isProcessing = false;
            };

            processActivity();
        }
    } catch (error) {
        logger.error("Error completing quest:", error);
        showToast("Failed to complete quest!", Toasts.Type.FAILURE);
        isProcessing = false;
    }
}

function restartIntervalCheck() {
    if (checkIntervalId) {
        clearInterval(checkIntervalId);
        checkIntervalId = null;
    }

    const interval = settings.store.checkInterval;
    if (interval > 0 && settings.store.autoStart) {
        logger.info(`Starting periodic quest check every ${interval} minutes`);
        checkIntervalId = setInterval(() => {
            if (!isProcessing && settings.store.autoStart) {
                logger.info("Periodic check: Looking for quests...");
                completeQuest();
            }
        }, interval * 60 * 1000);
    }
}

export default definePlugin({
    name: "AutoCompleteQuest",
    description: "Automatically complete Discord quests",
    authors: [{
        name: "Quang Blue",
        id: 439262471765884939n
    }],
    settings,

    start() {
        logger.info("AutoCompleteQuest started");
        
        // Check for quest when plugin starts if autoStart is enabled
        if (settings.store.autoStart) {
            setTimeout(() => {
                logger.info("Auto-start is enabled, checking for quests...");
                completeQuest();
            }, 3000); // Wait 3 seconds for Discord to fully load
        }

        // Start periodic check
        restartIntervalCheck();

        // Subscribe to quest updates
        FluxDispatcher.subscribe("QUESTS_FETCH_CURRENT_QUESTS_SUCCESS", () => {
            if (settings.store.autoStart && !isProcessing) {
                logger.info("New quests detected, checking...");
                setTimeout(() => completeQuest(), 1000);
            }
        });
    },

    stop() {
        logger.info("AutoCompleteQuest stopped");
        if (checkIntervalId) {
            clearInterval(checkIntervalId);
            checkIntervalId = null;
        }
    },

    commands: [
        {
            name: "completequest",
            description: "Auto complete current Discord quest",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {
                await completeQuest();
            }
        }
    ]
});
