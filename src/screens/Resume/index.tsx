import React, { useState, useCallback } from 'react';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ActivityIndicator } from 'react-native';
import { HistoryCard } from '../../components/HistoryCard';
import { useFocusEffect } from '@react-navigation/core';
import { useTheme } from 'styled-components';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { categories } from '../../utils/categories';
import { VictoryPie } from 'victory-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { addMonths, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Container,
  Header,
  Title,
  Content,
  ChartContainer,
  MonthSelect,
  MounthSelectButton,
  MounthSelectIcon,
  Mounth,
  LoadingContainer,
} from './styles';
import { useAuth } from '../../hooks/auth';

interface TransactionData {
  type: 'positive' | 'negative';
  name: string;
  amount: string;
  category: string;
  date: string;
}

interface CategoryData {
  key: string;
  name: string;
  total: number;
  totalFormated: string;
  color: string;
  percent: string;
}

export function Resume() {
  const [isLoading, setIsLoading] = useState(false);
  const [totalByCategories, setTotalByCategories] = useState<CategoryData[]>(
    []
  );
  const [selectedData, setSelectedData] = useState(new Date());
  const theme = useTheme();
  const {user} = useAuth();


  function handleDataChange(action: 'next' | 'prev') {
    
    if (action === 'next') {
      setSelectedData(addMonths(selectedData, 1));
    } else {
      setSelectedData(subMonths(selectedData, 1));
    }
  }

  async function loadData() {
    setIsLoading(true)
    const collectionKey = `@gofinances:transactions_user:${user.id}`;
    const response = await AsyncStorage.getItem(collectionKey);
    const responseFormatted = response ? JSON.parse(response) : [];

    const expensives = responseFormatted.filter(
      (expensive: TransactionData) =>
        expensive.type === 'negative' &&
        new Date(expensive.date).getMonth() === selectedData.getMonth() &&
        new Date(expensive.date).getFullYear() === selectedData.getFullYear()
    );

    //Pegar uma coleção e salvar o elemento
    const expensivesTotal = expensives.reduce(
      (acumullator: number, expensive: TransactionData) => {
        return acumullator + Number(expensive.amount);
      },
      0
    );

    const totalByCategory: CategoryData[] = [];

    categories.forEach((category) => {
      let categorySum = 0;
      expensives.forEach((expensive: TransactionData) => {
        if (expensive.category === category.key) {
          categorySum += Number(expensive.amount);
        }
      });

      if (categorySum > 0) {
        const total = categorySum.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });

        const percent = `${((categorySum / expensivesTotal) * 100).toFixed(
          0
        )}%`;

        totalByCategory.push({
          key: category.key,
          name: category.name,
          color: category.color,
          total: categorySum,
          totalFormated: total,
          percent,
        });
      }
    });
    setTotalByCategories(totalByCategory);
    setIsLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedData])
  );

  return (
    <Container>
      <Header>
        <Title>Resumo por categoria</Title>
      </Header>
      {isLoading ? (
        <LoadingContainer>
          <ActivityIndicator color={theme.colors.primary} size='large' />
        </LoadingContainer>
      ) : (
        <Content
          contentContainerStyle={{
            paddingBottom: useBottomTabBarHeight(),
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <MonthSelect>
            <MounthSelectButton onPress={() => handleDataChange('prev')}>
              <MounthSelectIcon name='chevron-left' />
            </MounthSelectButton>
            <Mounth>
              {format(selectedData, 'MMMM, yyyy', { locale: ptBR })}
            </Mounth>
            <MounthSelectButton onPress={() => handleDataChange('next')}>
              <MounthSelectIcon name='chevron-right' />
            </MounthSelectButton>
          </MonthSelect>

          <ChartContainer>
            <VictoryPie
              data={totalByCategories}
              colorScale={totalByCategories.map((category) => category.color)}
              style={{
                labels: {
                  fontSize: RFValue(18),
                  fontWeight: 'bold',
                  fill: theme.colors.shape,
                },
              }}
              labelRadius={60}
              x='percent'
              y='total'
            />
          </ChartContainer>

          {totalByCategories.map((item) => (
            <HistoryCard
              key={item.key}
              title={item.name}
              amount={item.totalFormated}
              color={item.color}
            />
          ))}
        </Content>
      )}
    </Container>
  );
}

export default Resume;
