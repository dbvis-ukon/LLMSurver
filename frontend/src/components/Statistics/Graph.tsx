import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import * as Types from "Types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  classifications: Types.ModelResponse[][];
  consensus: string[];
  // There are two types of graphs, overall classification distribution and amount of models that include a specific paper
  type: "dist" | "except";
}

export default function Graph({ classifications, consensus, type }: Props) {
  const distLabels = ["unknown", "include", "discard", "error"];
  const [dist, setDist] = useState<Types.GraphData[]>([]);
  const [exceptLabels, setExceptLabels] = useState<string[]>([]);
  const [except, setExcept] = useState<Types.GraphData[]>([]);
  const colors = [
    "rgb(76,163,224)",
    "rgb(255,165,86)",
    "rgb(87,208,87)",
    "rgb(227,102,103)",
    "rgb(180,148,208)",
    "rgb(182, 131, 120)",
    "rgb(235, 159, 212)",
    "rgb(165, 165, 165)",
  ] as const;
  const options = {
    maintainAspectRatio: false,
    devicePixelRatio: window.devicePixelRatio,
    plugins: {
      legend: {
        maxWidth: "150",
        position: "right",
        labels: {
          usePointStyle: "true",
          color: "rgb(236, 237, 238)",
          generateLabels: (chart: any) =>
            chart.data.datasets.map(function (l: any, i: number) {
              const texter = (t: string) => {
                if (t.length > 15) return t.substring(0, 13) + "...";
                else return t;
              };

              return {
                datasetIndex: 0,
                index: i,
                fontColor: "white",
                text: texter(l.label),
                fillStyle: l.backgroundColor,
              };
            }),
        },
        onClick: null,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          color: "rgb(236, 237, 238)",
        },
        ticks: {
          color: "rgb(236, 237, 238)",
        },
      },
      y: {
        grid: {
          display: false,
        },
        border: {
          color: "rgb(236, 237, 238)",
        },
        ticks: {
          color: "rgb(236, 237, 238)",
        },
      },
    },
    animation: { duration: 0 },
  };

  useEffect(() => {
    if (consensus.length > 0) {
      if (type === "dist") {
        setDist(
          classifications.reduce((acc: Types.GraphData[], cl) => {
            cl.forEach((mod) => {
              if (consensus.includes(mod.model_name)) {
                const decision = mod.classification;
                const existingModel = acc.find(
                  (m) => m.model === mod.model_name
                );
                if (existingModel) {
                  existingModel.counts[decision]++;
                } else {
                  const newCounts = [0, 0, 0, 0];
                  newCounts[decision]++;
                  acc.push({
                    model: mod.model_name,
                    counts: newCounts,
                  });
                }
              }
            });
            return acc;
          }, [] as Types.GraphData[])
        );
      } else if (type === "except") {
        setExceptLabels(
          Array.from(
            { length: consensus.length + 1 },
            (_, index) => `${index} including`
          )
        );

        const statistics: Types.GraphData[] = ["total"]
          .concat([...consensus])
          .map((con) => ({
            model: con,
            counts: Array(consensus.length + 1).fill(0),
          }));

        classifications.forEach((cl) => {
          const including: string[] = [];
          let known = false;
          cl.forEach((mod) => {
            if (consensus.includes(mod.model_name)) {
              if (mod.classification === 1) including.push(mod.model_name);
              else if (mod.classification === 2 || mod.classification === 3)
                known = true;
            }
          });
          statistics.forEach(
            (stat) =>
            (stat.counts[including.length] +=
              (stat.model === "total" && known) ||
                including.includes(stat.model) ||
                (including.length === 0 && known)
                ? 1
                : 0)
          );
        });
        setExcept(statistics);
      }
    }
  }, [consensus]);

  const distData = {
    labels: distLabels,
    datasets: dist.map((d, i) => ({
      label: d.model,
      data: d.counts,
      backgroundColor: colors[i % colors.length],
    })),
  };

  const exceptData = {
    labels: exceptLabels,
    datasets: except.map((e, i) => ({
      label: e.model,
      data: e.counts,
      grouped: e.model === "total" ? false : true,
      categoryPercentage: e.model === "total" ? 1 : 0.9,
      barPercantage: e.model === "total" ? 1 : 1 / (except.length - 1),
      order: e.model === "total" ? 1 : 0,
      backgroundColor:
        e.model === "total" ? "#3f3f46" : colors[(i - 1) % colors.length],
    })),
  };

  return (
    <div className="h-full w-full">
      {consensus.length > 0 ? (
        <Bar options={options} data={type === "dist" ? distData : exceptData} />
      ) : (
        <></>
      )}
    </div>
  );
}
