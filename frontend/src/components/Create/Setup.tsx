import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Tooltip,
} from "@heroui/react";
import { useState } from "react";
import {
  FaCirclePlus,
  FaCircleMinus,
  FaCircleCheck,
  FaPenToSquare,
} from "react-icons/fa6";
import * as Types from "Types";

interface Props {
  onClose: () => void;
  showModal: boolean;
  models: Types.Model[];
  getModels: () => void;
}

export default function Setup({
  onClose,
  showModal,
  models,
  getModels,
}: Props) {
  const [parameters, setParameters] = useState<
    { name: string; value: string }[]
  >([]);
  // Empty model in case model has to be added instead of modified
  const none: Types.Model = {
    model_id: -1,
    host: "",
    name: "New Model...",
    key: "",
  };
  const [selected, setSelected] = useState<Types.Model>(none);
  const [newModel, setNewModel] = useState("");

  async function getParameters(key: number) {
    try {
      const response = await fetch("/api/get_parameters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_id: key,
        }),
      });
      const data = await response.json();
      setParameters(data.parameters ? data.parameters : []);
    } catch (error) {
      console.error(error);
    }
  }

  // If preexisting model has to be modified, displays information currently in database
  async function handleSwitch(key: number) {
    setSelected(
      [none, ...models].find((model) => model.model_id === key) || none
    );
    if (key > 0) {
      getParameters(key);
    } else {
      setNewModel("");
      setParameters([]);
    }
  }

  async function handleSubmit() {
    // If a model is currently selected, that model is modified
    const edit = selected.model_id > 0;
    const values = {
      ...selected,
      name: edit ? selected.name : newModel,
    };
    try {
      const response = await fetch("/api/set_model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          parameters: parameters,
          edit: edit,
        }),
      });
      const data = await response.json();
      if (!data.error) {
        getModels();
        getParameters(data.model_id);
        if (!edit)
          setSelected((prev) => ({
            ...prev,
            model_id: data.model_id,
            name: data.name,
          }));
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Modal
      className="dark text-foreground bg-background"
      isOpen={showModal}
      onOpenChange={onClose}
      size="full"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader>
          <Dropdown showArrow>
            <DropdownTrigger>
              <Button>{selected.name}</Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="models"
              onAction={(key) => handleSwitch(Number(key))}
            >
              {[none, ...models].map((model) => (
                <DropdownItem key={model.model_id}>{model.name}</DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </ModalHeader>
        <ModalBody>
          <Input
            classNames={{
              inputWrapper: "px-0 pl-3",
            }}
            placeholder="Host"
            variant="bordered"
            value={selected.host}
            onChange={(e) =>
              setSelected((prev) => ({ ...prev, host: e.target.value }))
            }
          />
          {selected.model_id > 0 ? (
            <Tooltip
              showArrow={true}
              content="Can't change model name, create new model"
            >
              <span>
                <Input
                  isDisabled
                  classNames={{
                    inputWrapper: "px-0 pl-3",
                  }}
                  placeholder="Model"
                  variant="bordered"
                  value={selected.name}
                />
              </span>
            </Tooltip>
          ) : (
            <Input
              classNames={{
                inputWrapper: "px-0 pl-3",
              }}
              placeholder="Model"
              variant="bordered"
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
            />
          )}
          <Input
            classNames={{
              inputWrapper: "px-0 pl-3",
            }}
            placeholder="Key"
            variant="bordered"
            value={selected.key}
            onChange={(e) =>
              setSelected((prev) => ({ ...prev, key: e.target.value }))
            }
          />
          {parameters.map((para, i) => (
            <div key={i} className="flex w-full gap-0">
              <Input
                classNames={{
                  inputWrapper: "px-0 pl-3 rounded-r-none",
                }}
                placeholder="Parameter"
                variant="bordered"
                value={para.name}
                onChange={(e) =>
                  setParameters((prev) =>
                    prev.map((p, index) =>
                      index === i ? { ...p, name: e.target.value } : p
                    )
                  )
                }
              />
              <Input
                classNames={{
                  inputWrapper: "px-0 pl-3 rounded-l-none",
                }}
                placeholder="Value"
                variant="bordered"
                value={para.value}
                onChange={(e) =>
                  setParameters((prev) =>
                    prev.map((p, index) =>
                      index === i ? { ...p, value: e.target.value } : p
                    )
                  )
                }
              />
            </div>
          ))}
          <div className="flex w-full gap-4">
            <Tooltip showArrow={true} content="Add Parameter">
              <Button
                isIconOnly
                onPress={() =>
                  setParameters((prev) => [...prev, { name: "", value: "" }])
                }
              >
                <FaCirclePlus />
              </Button>
            </Tooltip>
            <Tooltip showArrow={true} content="Remove Parameter">
              <span>
                <Button
                  isDisabled={parameters.length === 0}
                  isIconOnly
                  onPress={() => setParameters((prev) => prev.slice(0, -1))}
                >
                  <FaCircleMinus />
                </Button>
              </span>
            </Tooltip>
            <Tooltip
              showArrow={true}
              content={
                selected.host.length === 0 ||
                  (selected.model_id > 0 && selected.name.length === 0) ||
                  (selected.model_id <= 0 && newModel.length === 0)
                  ? "Must set host and model name"
                  : selected.model_id > 0
                    ? "Edit Model"
                    : "Submit Model"
              }
            >
              <span>
                <Button
                  isDisabled={
                    selected.host.length === 0 ||
                    (selected.model_id > 0 && selected.name.length === 0) ||
                    (selected.model_id <= 0 && newModel.length === 0)
                  }
                  isIconOnly
                  onPress={handleSubmit}
                >
                  {selected.model_id > 0 ? (
                    <FaPenToSquare />
                  ) : (
                    <FaCircleCheck />
                  )}
                </Button>
              </span>
            </Tooltip>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
