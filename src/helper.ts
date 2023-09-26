import type { ICameraProps, IHighlighterStyle } from "./types";
export const bytesToSize = (bytes: number) => {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes == 0) return "n/a";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  if (i == 0) return bytes + " " + sizes[i];
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
};
export const getCurrentMemoryUsage = () => {
  try {
    if (
      window.performance &&
      "memory" in window.performance &&
      window.performance.memory
    ) {
      // Check if the performance.memory API is available
      //Maximum Capture time - Operation time of Capturing
      // Get memory information
      interface PerformanceMemory {
        usedJSHeapSize: number;
      }
      const memoryInfo = window.performance.memory as PerformanceMemory;

      // Get memory used in bytes
      const memoryUsedInBytes = memoryInfo.usedJSHeapSize;

      // Convert bytes to megabytes for a more readable result
      const memoryUsedInMB = memoryUsedInBytes / (1024 * 1024);

      return parseFloat(memoryUsedInMB.toFixed(2));
    } else {
      throw "UnSupported";
    }
  } catch (e) {
    return 0;
  }
};

export const msToTime = (duration: number): string => {
  const milliseconds = Math.floor((duration % 1000) / 100);
  let seconds: string | number = Math.floor((duration / 1000) % 60),
    minutes: string | number = Math.floor((duration / (1000 * 60)) % 60),
    hours: string | number = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
};

export const average = (arr: number[]) =>
  Math.round(arr.reduce((p, c) => p + c, 0) / arr.length);

export const getHighlighterStyle = (
  boundingBox: ICameraProps["boundingBox"],
  video: HTMLVideoElement | null
): IHighlighterStyle => {
  const widthRatio = video ? video?.clientWidth / video?.videoWidth : 1;
  const heightRatio = video ? video?.clientHeight / video?.videoHeight : 1;
  const [originX = 0, originY = 0, width = 0, height = 0] = boundingBox ?? [];

  return {
    left: `${originX}px`,
    top: `${originY * heightRatio}px`,
    width: `${width * widthRatio}px`,
    height: `${height * heightRatio}px`,
  };
};

export const groupBySecond = (arrData: number[]) => {
  const obj: Record<string, number[]> = {};
  arrData.forEach((e) => {
    const key = parseInt((e / 1000).toFixed(2));
    if (key in obj) {
      obj[key].push(e % 1000);
    } else {
      obj[key] = [e % 1000];
    }
  });
  return obj;
};

export const convertEntriesToCountObj = (
  objByEntries: Array<[string, number[]]>
) => {
  return objByEntries.reduce((result, [fst, snd]) => {
    result[fst] = snd.length;
    return result;
  }, {} as Record<string, number>);
};

export const convertEntriesToAvgDelayObj = (
  objByEntries: Array<[string, number[]]>
) => {
  return objByEntries.reduce((result, [fst, snd]) => {
    result[fst] = average(snd);
    return result;
  }, {} as Record<string, number>);
};

export const getIntervalDelay = (arr: number[]) => {
  const tempArr: number[] = [];
  arr.forEach((e, i) => {
    if (i !== 0) {
      tempArr.push(e - arr[i - 1]);
    }
  });
  return tempArr;
};

export const removeFstLastEle = (arrData: [string, number[]][]) => {
  arrData.splice(0, 1);
  arrData.splice(arrData.length, 1);
  return arrData;
};

export const getMetrics = (arr: number[]) => {
  const groupedArr = groupBySecond(arr);
  const objEntries = removeFstLastEle(Object.entries(groupedArr));

  const avgCountGroupedBySec = convertEntriesToCountObj(objEntries);
  const avgIntervalGroupedBySec = convertEntriesToAvgDelayObj(objEntries);
  const avg_count_ps = average(Object.values(avgCountGroupedBySec));
  const avg_interval_ps = average(Object.values(avgIntervalGroupedBySec));

  const avg_interval = average(getIntervalDelay(arr));

  return {
    avg_count_ps,
    avg_interval_ps,
    avg_interval,
  };
};
