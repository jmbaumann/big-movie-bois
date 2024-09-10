import { useState } from "react";

export type UseArray<T> = {
  array: T[];
  add: (element: T) => void;
  removeAt: (index: number) => void;
  removeValue: (value: T) => void;
  removeByField: <K extends keyof T>(field: K, value: T[K]) => void;
  updateAt: (index: number, newElement: T) => void;
  clear: () => void;
  set: (newArray: T[]) => void;
  length: number;
};

export const useArray = <T>(initialArray: T[] = []) => {
  const [array, setArray] = useState<T[]>(initialArray);

  const add = (element: T) => {
    setArray((prevArray) => [...prevArray, element]);
  };

  const removeAt = (index: number) => {
    setArray((prevArray) => prevArray.filter((_, i) => i !== index));
  };

  const removeValue = (value: T) => {
    const index = array.findIndex((e) => e === value);
    setArray((prevArray) => prevArray.filter((_, i) => i !== index));
  };

  const removeByField = <K extends keyof T>(field: K, value: T[K]) => {
    const index = array.findIndex((e) => e[field] === value);
    setArray((prevArray) => prevArray.filter((_, i) => i !== index));
  };

  const updateAt = (index: number, newElement: T) => {
    setArray((prevArray) =>
      prevArray.map((el, i) => (i === index ? newElement : el)),
    );
  };

  const clear = () => {
    setArray([]);
  };

  const set = (newArray: T[]) => {
    setArray(newArray);
  };

  const length = array.length;

  return {
    array,
    add,
    removeAt,
    removeValue,
    removeByField,
    updateAt,
    clear,
    set,
    length,
  };
};
