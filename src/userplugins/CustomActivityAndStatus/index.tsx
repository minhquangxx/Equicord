/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Button, showToast, Toasts, Tooltip, useEffect, useState, UserStore, FluxDispatcher, RestAPI, PresenceStore, AuthenticationStore } from "@webpack/common";
import { Activity as DiscordActivity } from "@vencord/discord-types";

enum ActivityType {
    Playing = 0,
    Streaming = 1,
    Listening = 2,
    Watching = 3,
    Competing = 5
}

enum StatusType {
    Online = "online",
    Idle = "idle",
    DND = "dnd",
    Invisible = "invisible"
}

interface Activity extends DiscordActivity {
    name: string;
}

interface WhitelistEntry {
    id: string;
    name: string;
}

// Stores
const getUserId = () => AuthenticationStore.getId();

function getActivityTypeName(type: number): string {
    switch (type) {
        case 0: return "Playing";
        case 1: return "Streaming";
        case 2: return "Listening";
        case 3: return "Watching";
        case 5: return "Competing";
        default: return "Unknown";
    }
}

async function setUserStatus(status: string) {
    try {
        const userStatus = getUserSettingLazy<string>("status", "status");
        if (userStatus) {
            await userStatus.updateSetting(status);
        }
    } catch (e) {
        console.error("Error setting status:", e);
    }
}

const settings = definePluginSettings({
    ignorePlaying: {
        type: OptionType.BOOLEAN,
        description: "Ignore all playing activities except whitelisted ones",
        default: false,
    },
    ignorePlayingWhitelist: {
        type: OptionType.CUSTOM,
        default: [] as WhitelistEntry[],
        description: "Whitelisted activities for Playing type"
    },
    ignorePlayingStatus: {
        type: OptionType.SELECT,
        description: "Status to set when ignoring playing activities",
        options: [
            { label: "Online", value: StatusType.Online },
            { label: "Idle", value: StatusType.Idle },
            { label: "Do Not Disturb", value: StatusType.DND },
            { label: "Invisible", value: StatusType.Invisible }
        ],
        default: StatusType.Online
    },

    ignoreStreaming: {
        type: OptionType.BOOLEAN,
        description: "Ignore all streaming activities except whitelisted ones",
        default: false,
    },
    ignoreStreamingMode: {
        type: OptionType.SELECT,
        description: "How to ignore streaming activities",
        options: [
            { label: "Hide all (from preview & status)", value: "full" },
            { label: "Hide preview only", value: "preview_only" }
        ],
        default: "full",
    },
    ignoreStreamingWhitelist: {
        type: OptionType.CUSTOM,
        default: [] as WhitelistEntry[],
        description: "Whitelisted activities for Streaming type"
    },
    ignoreStreamingStatus: {
        type: OptionType.SELECT,
        description: "Status to set when ignoring streaming activities",
        options: [
            { label: "Online", value: StatusType.Online },
            { label: "Idle", value: StatusType.Idle },
            { label: "Do Not Disturb", value: StatusType.DND },
            { label: "Invisible", value: StatusType.Invisible }
        ],
        default: StatusType.Online
    },

    ignoreListening: {
        type: OptionType.BOOLEAN,
        description: "Ignore all listening activities except whitelisted ones",
        default: false,
    },
    ignoreListeningWhitelist: {
        type: OptionType.CUSTOM,
        default: [] as WhitelistEntry[],
        description: "Whitelisted activities for Listening type"
    },
    ignoreListeningStatus: {
        type: OptionType.SELECT,
        description: "Status to set when ignoring listening activities",
        options: [
            { label: "Online", value: StatusType.Online },
            { label: "Idle", value: StatusType.Idle },
            { label: "Do Not Disturb", value: StatusType.DND },
            { label: "Invisible", value: StatusType.Invisible }
        ],
        default: StatusType.Online
    },

    ignoreWatching: {
        type: OptionType.BOOLEAN,
        description: "Ignore all watching activities except whitelisted ones",
        default: false,
    },
    ignoreWatchingWhitelist: {
        type: OptionType.CUSTOM,
        default: [] as WhitelistEntry[],
        description: "Whitelisted activities for Watching type"
    },
    ignoreWatchingStatus: {
        type: OptionType.SELECT,
        description: "Status to set when ignoring watching activities",
        options: [
            { label: "Online", value: StatusType.Online },
            { label: "Idle", value: StatusType.Idle },
            { label: "Do Not Disturb", value: StatusType.DND },
            { label: "Invisible", value: StatusType.Invisible }
        ],
        default: StatusType.Online
    },

    ignoreCompeting: {
        type: OptionType.BOOLEAN,
        description: "Ignore all competing activities except whitelisted ones",
        default: false,
    },
    ignoreCompetingWhitelist: {
        type: OptionType.CUSTOM,
        default: [] as WhitelistEntry[],
        description: "Whitelisted activities for Competing type"
    },
    ignoreCompetingStatus: {
        type: OptionType.SELECT,
        description: "Status to set when ignoring competing activities",
        options: [
            { label: "Online", value: StatusType.Online },
            { label: "Idle", value: StatusType.Idle },
            { label: "Do Not Disturb", value: StatusType.DND },
            { label: "Invisible", value: StatusType.Invisible }
        ],
        default: StatusType.Online
    },

    activityManager: {
        type: OptionType.COMPONENT,
        description: "Manage activity whitelists",
        component: () => <ActivityManagerComponent />
    }
});

interface ToggleActivityButtonProps {
    activity: {
        id: string;
        name: string;
        type: number;
    };
}

function ToggleActivityButton(props: ToggleActivityButtonProps) {
    const s = settings.use(["ignorePlayingWhitelist", "ignoreStreamingWhitelist", "ignoreListeningWhitelist", "ignoreWatchingWhitelist", "ignoreCompetingWhitelist"]);

    const whitelistKey = {
        0: "ignorePlayingWhitelist",
        1: "ignoreStreamingWhitelist",
        2: "ignoreListeningWhitelist",
        3: "ignoreWatchingWhitelist",
        5: "ignoreCompetingWhitelist"
    }[props.activity.type] as keyof typeof s;

    const whitelist = (s as any)[whitelistKey] as WhitelistEntry[];
    const appId = props.activity.id;
    const isWhitelisted = whitelist.some(w => {
        if (!appId) return w.name === props.activity.name;
        return w.id === appId && w.name === props.activity.name;
    });

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newWhitelist = [...whitelist];
        const index = newWhitelist.findIndex(w => {
            if (!appId) return w.name === props.activity.name;
            return w.id === appId && w.name === props.activity.name;
        });
        if (index === -1) {
            newWhitelist.push({ id: props.activity.id || "", name: props.activity.name });
            (settings.store as any)[whitelistKey] = newWhitelist;
            showToast(`Added "${props.activity.name}" to whitelist`, Toasts.Type.SUCCESS);
        } else {
            newWhitelist.splice(index, 1);
            (settings.store as any)[whitelistKey] = newWhitelist;
            showToast(`Removed "${props.activity.name}" from whitelist`, Toasts.Type.SUCCESS);
        }
    };

    const fill = isWhitelisted ? "var(--status-danger)" : "var(--interactive-icon-default, var(--interactive-normal))";
    const tooltipText = isWhitelisted ? "Remove from whitelist" : "Add to whitelist";

    return (
        <Tooltip text={tooltipText}>
            {tooltipProps => (
                <button
                    {...tooltipProps}
                    onClick={handleClick}
                    style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}
                >
                    <svg width="24" height="24" viewBox="0 -960 960 960">
                        <path fill={fill} d={isWhitelisted ?
                            "m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z" :
                            "M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"
                        } />
                    </svg>
                </button>
            )}
        </Tooltip>
    );
}

function ActivityManagerComponent() {
    const [activities, setActivities] = useState<Activity[]>([]);

    useEffect(() => {
        const updateActivities = () => {
            try {
                const userId = getUserId();
                const activities = PresenceStore.getActivities(userId) || [];
                const filtered = activities.filter((act: any) => {
                    return [0, 1, 2, 3, 5].includes(act.type);
                });
                setActivities(filtered);
            } catch (e) {
                console.error("Error updating activities:", e);
            }
        };

        updateActivities();
        const interval = setInterval(updateActivities, 500);
        return () => clearInterval(interval);
    }, []);

    const activityTypeColors: Record<number, string> = {
        0: "#5865F2", // Playing - Blue
        1: "#EB459E", // Streaming - Pink
        2: "#1DB954", // Listening - Green (Spotify)
        3: "#FF6B6B", // Watching - Red
        5: "#FAA61A"  // Competing - Orange
    };

    return (
        <ErrorBoundary noop>
            <Flex flexDirection="column" style={{ gap: "20px" }}>
                <div>
                    <HeadingSecondary>Current Activities</HeadingSecondary>
                    <Paragraph className={Margins.bottom8}>Click "Add to Whitelist" to prevent an activity from being hidden</Paragraph>
                </div>

                {activities.length === 0 ? (
                    <Paragraph>No active activities</Paragraph>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                        {activities.map((activity, idx) => {
                            const activityType = activity.type as number;
                            const typeLabel = getActivityTypeName(activityType);
                            const whitelistKey = Object.entries({
                                [ActivityType.Playing]: "ignorePlayingWhitelist",
                                [ActivityType.Streaming]: "ignoreStreamingWhitelist",
                                [ActivityType.Listening]: "ignoreListeningWhitelist",
                                [ActivityType.Watching]: "ignoreWatchingWhitelist",
                                [ActivityType.Competing]: "ignoreCompetingWhitelist"
                            }).find(([key]) => parseInt(key) === activityType)?.[1] || "";

                            const whitelist = (settings.store as any)[whitelistKey] as WhitelistEntry[];
                            const appId = activity.application_id;
                            const isWhitelisted = whitelist.some(w => {
                                if (!appId) return w.name === activity.name;
                                return w.id === appId && w.name === activity.name;
                            });

                            return (
                                <div
                                    key={idx}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "12px",
                                        backgroundColor: "var(--background-secondary)",
                                        borderRadius: "6px",
                                        border: isWhitelisted ? `2px solid ${activityTypeColors[activityType] || "#5865F2"}` : "1px solid var(--background-tertiary)"
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <Paragraph style={{ margin: 0, fontWeight: "500" }}>{activity.name}</Paragraph>
                                        <Paragraph style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                                            Type: <span style={{ color: activityTypeColors[activityType] || "#5865F2", fontWeight: "500" }}>{typeLabel}</span>
                                        </Paragraph>
                                    </div>
                                    <Tooltip text={isWhitelisted ? "Remove from whitelist" : "Add to whitelist"}>
                                        {tooltipProps => (
                                            <button
                                                {...tooltipProps}
                                                onClick={() => toggleActivityWhitelist(activityType, activity)}
                                                style={{
                                                    padding: "6px 12px",
                                                    marginLeft: "12px",
                                                    backgroundColor: isWhitelisted ? activityTypeColors[activityType] || "#5865F2" : "var(--interactive-normal)",
                                                    color: isWhitelisted ? "#fff" : "var(--interactive-active)",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    transition: "all 0.2s ease"
                                                }}
                                            >
                                                {isWhitelisted ? "✓ Whitelisted" : "Add"}
                                            </button>
                                        )}
                                    </Tooltip>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Flex>
        </ErrorBoundary>
    );
}

function toggleActivityWhitelist(activityType: number, activity: Activity) {
    const whitelistKeys: Record<number, string> = {
        0: "ignorePlayingWhitelist",
        1: "ignoreStreamingWhitelist",
        2: "ignoreListeningWhitelist",
        3: "ignoreWatchingWhitelist",
        5: "ignoreCompetingWhitelist"
    };

    const key = whitelistKeys[activityType] as keyof typeof settings.store;
    const whitelist = [...(settings.store[key] as WhitelistEntry[])];
    const appId = activity.application_id || "";
    const index = whitelist.findIndex(w => {
        if (!appId) return w.name === activity.name;
        return w.id === appId && w.name === activity.name;
    });

    if (index === -1) {
        whitelist.push({ id: appId, name: activity.name });
        (settings.store as any)[key] = whitelist;
        showToast(`Added "${activity.name}" to whitelist`, Toasts.Type.SUCCESS);
    } else {
        whitelist.splice(index, 1);
        (settings.store as any)[key] = whitelist;
        showToast(`Removed "${activity.name}" from whitelist`, Toasts.Type.SUCCESS);
    }
}

function applyActivityFilter() {
    try {
        const userId = getUserId();
        const activities = PresenceStore.getActivities(userId) || [];
        let shouldChangeStatus = false;
        let targetStatus = StatusType.Online;

        for (const activity of activities) {
            const shouldChangeStatusForActivity = isActivityShouldChangeStatus(activity);
            if (shouldChangeStatusForActivity) {
                shouldChangeStatus = true;
                targetStatus = getStatusForActivityType(activity.type);
                break;
            }
        }

        if (shouldChangeStatus) {
            setUserStatus(targetStatus);
        }
    } catch (e) {
        console.error("Error applying activity filter:", e);
    }
}

// Check if activity should be filtered from preview (used by patches)
function isActivityShouldBeIgnored(activity: any): boolean {
    const type = activity.type;
    const whitelist = getWhitelistForType(type);
    const appId = activity.application_id;

    // Check if activity is in whitelist
    // For activities without application_id (custom), match by name only
    const isWhitelisted = whitelist.some(w => {
        if (!appId) return w.name === activity.name;
        return w.id === appId && w.name === activity.name;
    });
    if (isWhitelisted) return false;

    switch (type) {
        case 0: // ActivityType.Playing
            return settings.store.ignorePlaying;
        case 1: // ActivityType.Streaming
            // Always filter from preview if enabled (regardless of mode)
            return settings.store.ignoreStreaming;
        case 2: // ActivityType.Listening
            return settings.store.ignoreListening;
        case 3: // ActivityType.Watching
            return settings.store.ignoreWatching;
        case 5: // ActivityType.Competing
            return settings.store.ignoreCompeting;
        default:
            return false;
    }
}

// Check if activity should change user status (used by applyActivityFilter)
function isActivityShouldChangeStatus(activity: any): boolean {
    const type = activity.type;
    const whitelist = getWhitelistForType(type);
    const appId = activity.application_id;

    // Check if activity is in whitelist
    // For activities without application_id (custom), match by name only
    const isWhitelisted = whitelist.some(w => {
        if (!appId) return w.name === activity.name;
        return w.id === appId && w.name === activity.name;
    });
    if (isWhitelisted) return false;

    switch (type) {
        case 0: // ActivityType.Playing
            return settings.store.ignorePlaying;
        case 1: // ActivityType.Streaming
            // Only change status for "full" mode, not "preview_only"
            return settings.store.ignoreStreaming && settings.store.ignoreStreamingMode === "full";
        case 2: // ActivityType.Listening
            return settings.store.ignoreListening;
        case 3: // ActivityType.Watching
            return settings.store.ignoreWatching;
        case 5: // ActivityType.Competing
            return settings.store.ignoreCompeting;
        default:
            return false;
    }
}

function getWhitelistForType(type: number): WhitelistEntry[] {
    const whitelistKeys: Record<number, string> = {
        0: "ignorePlayingWhitelist",
        1: "ignoreStreamingWhitelist",
        2: "ignoreListeningWhitelist",
        3: "ignoreWatchingWhitelist",
        5: "ignoreCompetingWhitelist"
    };

    return (settings.store as any)[whitelistKeys[type]] || [];
}

function getStatusForActivityType(type: number): StatusType {
    const statusKeys: Record<number, string> = {
        0: "ignorePlayingStatus",
        1: "ignoreStreamingStatus",
        2: "ignoreListeningStatus",
        3: "ignoreWatchingStatus",
        5: "ignoreCompetingStatus"
    };

    return (settings.store as any)[statusKeys[type]] || StatusType.Online;
}

export default definePlugin({
    name: "CustomActivityAndStatus",
    authors: [Devs.QuangBlue],
    description: "Customize activity visibility and status based on activity type with whitelist support",
    dependencies: ["UserSettingsAPI"],
    settings,

    patches: [
        {
            find: '"LocalActivityStore"',
            replacement: [
                {
                    match: /\.LISTENING.+?(?=!?\i\(\)\(\i,\i\))(?<=(\i)\.push.+?)/,
                    replace: (m, activities) => `${m}${activities}=${activities}.filter($self.isActivityNotFiltered);`
                },
                {
                    match: /this\._activities\.push\(\i\);/,
                    replace: (m) => `if($self.isActivityNotFiltered($argument0)) ${m}`
                }
            ]
        },
        {
            find: '"ActivityTrackingStore"',
            replacement: {
                match: /getVisibleRunningGames\(\).+?;(?=for)(?<=(\i)=\i\.\i\.getVisibleRunningGames.+?)/,
                replace: (m, runningGames) => `${m}${runningGames}=${runningGames}.filter(({id,name})=>$self.isActivityNotFiltered({type:0,application_id:id,name}));`
            }
        },

        // FIXME(Bundler minifier change related): Remove the non used compability once enough time has passed
        {
            find: "#{intl::SETTINGS_GAMES_TOGGLE_OVERLAY}",
            replacement: {
                // let { ... nowPlaying: a = !1 ...
                // let { overlay: b ... } = Props
                match: /#{intl::SETTINGS_GAMES_TOGGLE_OVERLAY}.+?}\(\),(?<=nowPlaying:(\i)=!1,.+?overlay:\i,[^}]+?\}=(\i).+?)/,
                replace: (m, nowPlaying, props) => `${m}$self.renderToggleGameActivityButton(${props},${nowPlaying}),`,
                noWarn: true,
            }
        },
        {
            find: "#{intl::SETTINGS_GAMES_TOGGLE_OVERLAY}",
            replacement: {
                // let { ... nowPlaying: a = !1 ...
                // let { overlay: b ... } = Props ...
                // ToggleOverLayButton(), nowPlaying && ... RemoveGameButton()
                match: /\.gameNameLastPlayed.+?,\i\(\),(?<=nowPlaying:(\i)=!1,.+?overlay:\i,[^}]+?\}=(\i).+?)(?=\1&&)/,
                replace: (m, nowPlaying, props) => `${m}$self.renderToggleGameActivityButton(${props},${nowPlaying}),`,
            }
        },

        // Activities from the apps launcher in the bottom right of the chat bar
        {
            find: ".promotedLabelWrapperNonBanner,children",
            replacement: {
                match: /\.appDetailsHeaderContainer.+?children:\i.*?}\),(?<=application:(\i).+?)/,
                replace: (m, props) => `${m}$self.renderToggleActivityButton(${props}),`
            }
        }
    ],
    async start() {
        // Initial filter
        applyActivityFilter();

        // Reapply filter on interval
        this.updateInterval = setInterval(() => {
            applyActivityFilter();
        }, 1000);
    },

    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    },

    isActivityNotFiltered(activity: any): boolean {
        return !isActivityShouldBeIgnored(activity);
    },

    renderToggleActivityButton(props: { id: string; name: string; }) {
        return (
            <ErrorBoundary noop>
                <div style={{ marginLeft: 12, zIndex: 0 }}>
                    <ToggleActivityButton activity={{ id: props.id, name: props.name, type: 0 }} />
                </div>
            </ErrorBoundary>
        );
    }
});
